const router  = require('express').Router();
const { body, param, query } = require('express-validator');
const Habit   = require('../models/Habit');
const { protect }    = require('../middleware/auth');
const { asyncHandler, validate } = require('../middleware/errorHandler');
const { successResponse } = require('../utils/jwt');

// All habit routes require authentication
router.use(protect);

// ── Validation helpers ────────────────────────────────────────
const habitBodyRules = [
  body('name')    .trim().notEmpty().withMessage('Habit name required').isLength({ max: 80 }),
  body('emoji')   .optional().isString().isLength({ max: 8 }),
  body('category').optional().isIn(['health','study','work','discipline']),
  body('goal')    .optional().isInt({ min: 1, max: 5 }),
  body('order')   .optional().isInt({ min: 0 }),
];

const mongoIdParam = (field) =>
  param(field).isMongoId().withMessage(`${field} must be a valid ID`);

// ─────────────────────────────────────────────────────────────
// GET /api/habits
// ─────────────────────────────────────────────────────────────
/**
 * @route   GET /api/habits
 * @desc    Get all habits for authenticated user
 * @query   category, isActive (default true), search
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.user._id };

    // Optional filters
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive !== 'false';
    else
      filter.isActive = true;

    if (req.query.category &&
        ['health','study','work','discipline'].includes(req.query.category))
      filter.category = req.query.category;

    if (req.query.search)
      filter.name = { $regex: req.query.search, $options: 'i' };

    const habits = await Habit.find(filter).sort({ order: 1, createdAt: 1 });

    successResponse(res, { count: habits.length, habits });
  })
);

// ─────────────────────────────────────────────────────────────
// POST /api/habits
// ─────────────────────────────────────────────────────────────
/**
 * @route   POST /api/habits
 * @desc    Create a new habit
 * @access  Private
 */
router.post(
  '/',
  habitBodyRules, validate,
  asyncHandler(async (req, res) => {
    // Auto-assign order = count of existing habits
    const count = await Habit.countDocuments({ userId: req.user._id });
    const habit = await Habit.create({
      userId:      req.user._id,
      name:        req.body.name,
      emoji:       req.body.emoji       || '⭐',
      category:    req.body.category    || 'discipline',
      goal:        req.body.goal        || 1,
      order:       req.body.order       ?? count,
      aiGenerated: req.body.aiGenerated || false,
      aiGoal:      req.body.aiGoal      || '',
    });
    res.status(201).json({ success: true, habit });
  })
);

// ─────────────────────────────────────────────────────────────
// GET /api/habits/:id
// ─────────────────────────────────────────────────────────────
/**
 * @route   GET /api/habits/:id
 * @desc    Get a single habit by ID
 * @access  Private
 */
router.get(
  '/:id',
  [mongoIdParam('id')], validate,
  asyncHandler(async (req, res) => {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) return res.status(404).json({ success: false, error: 'Habit not found' });
    successResponse(res, { habit });
  })
);

// ─────────────────────────────────────────────────────────────
// PATCH /api/habits/:id
// ─────────────────────────────────────────────────────────────
/**
 * @route   PATCH /api/habits/:id
 * @desc    Update a habit (partial update — only provided fields change)
 * @access  Private
 */
router.patch(
  '/:id',
  [mongoIdParam('id'), ...habitBodyRules], validate,
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'emoji', 'category', 'goal', 'order', 'isActive'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!habit) return res.status(404).json({ success: false, error: 'Habit not found' });
    successResponse(res, { habit }, 'Habit updated');
  })
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/habits/:id
// ─────────────────────────────────────────────────────────────
/**
 * @route   DELETE /api/habits/:id
 * @desc    Soft-delete a habit (sets isActive: false)
 *          Use ?hard=true to permanently delete
 * @access  Private
 */
router.delete(
  '/:id',
  [mongoIdParam('id')], validate,
  asyncHandler(async (req, res) => {
    const filter = { _id: req.params.id, userId: req.user._id };

    if (req.query.hard === 'true') {
      const habit = await Habit.findOneAndDelete(filter);
      if (!habit) return res.status(404).json({ success: false, error: 'Habit not found' });
      return successResponse(res, {}, 'Habit permanently deleted');
    }

    const habit = await Habit.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );
    if (!habit) return res.status(404).json({ success: false, error: 'Habit not found' });
    successResponse(res, { habit }, 'Habit archived');
  })
);

// ─────────────────────────────────────────────────────────────
// POST /api/habits/reorder  (batch order update)
// ─────────────────────────────────────────────────────────────
/**
 * @route   POST /api/habits/reorder
 * @desc    Update sort order of multiple habits in one request
 * @body    { orders: [{ id: ObjectId, order: Number }] }
 * @access  Private
 */
router.post(
  '/reorder',
  [
    body('orders').isArray({ min: 1 }).withMessage('orders must be a non-empty array'),
    body('orders.*.id').isMongoId().withMessage('Each id must be a valid ObjectId'),
    body('orders.*.order').isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const ops = req.body.orders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id, userId: req.user._id },
        update: { order },
      },
    }));
    await Habit.bulkWrite(ops);
    successResponse(res, {}, 'Order updated');
  })
);

module.exports = router;
