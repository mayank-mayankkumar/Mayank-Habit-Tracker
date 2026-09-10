const router = require('express').Router();
const { body, param } = require('express-validator');
const { Note }    = require('../models/CheckIn');
const Habit       = require('../models/Habit');
const { protect } = require('../middleware/auth');
const { asyncHandler, validate } = require('../middleware/errorHandler');
const { successResponse } = require('../utils/jwt');

router.use(protect);

const VALID_MOODS = ['🔥','💪','😐','😴','❌'];
const VALID_TAGS  = ['win','struggle','insight','personal','important'];

// ─────────────────────────────────────────────────────────────
// GET /api/notes?habitId=&year=&month=
// ─────────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.user._id };
    if (req.query.habitId) filter.habitId = req.query.habitId;
    if (req.query.year && req.query.month) {
      const mm  = String(Number(req.query.month) + 1).padStart(2,'0');
      filter.date = { $gte: `${req.query.year}-${mm}-01`, $lte: `${req.query.year}-${mm}-31` };
    }
    const notes = await Note.find(filter).sort({ date: -1 }).limit(100);
    successResponse(res, { count: notes.length, notes });
  })
);

// ─────────────────────────────────────────────────────────────
// PUT /api/notes  (upsert — create or update)
// ─────────────────────────────────────────────────────────────
/**
 * @route   PUT /api/notes
 * @desc    Upsert a note for a (habitId, date) pair
 * @body    { habitId, date, text, mood, tags }
 * @access  Private
 *
 * Idempotent: calling with same habitId+date updates the existing note.
 */
router.put(
  '/',
  [
    body('habitId').isMongoId(),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
    body('text').optional().isString().isLength({ max: 500 }),
    body('mood').optional().isIn([...VALID_MOODS, null, '']),
    body('tags').optional().isArray(),
    body('tags.*').optional().isIn(VALID_TAGS),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { habitId, date, text = '', mood = null, tags = [] } = req.body;

    // Verify habit ownership
    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) return res.status(404).json({ success: false, error: 'Habit not found' });

    const note = await Note.findOneAndUpdate(
      { userId: req.user._id, habitId, date },
      { text, mood: mood || null, tags: tags.filter(t => VALID_TAGS.includes(t)) },
      { upsert: true, new: true, runValidators: true }
    );
    successResponse(res, { note }, 'Note saved');
  })
);

// ─────────────────────────────────────────────────────────────
// GET /api/notes/:habitId/:date
// ─────────────────────────────────────────────────────────────
router.get(
  '/:habitId/:date',
  asyncHandler(async (req, res) => {
    const note = await Note.findOne({
      userId:  req.user._id,
      habitId: req.params.habitId,
      date:    req.params.date,
    });
    if (!note) return res.status(404).json({ success: false, error: 'Note not found' });
    successResponse(res, { note });
  })
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/notes/:habitId/:date
// ─────────────────────────────────────────────────────────────
router.delete(
  '/:habitId/:date',
  asyncHandler(async (req, res) => {
    await Note.findOneAndDelete({
      userId:  req.user._id,
      habitId: req.params.habitId,
      date:    req.params.date,
    });
    successResponse(res, {}, 'Note deleted');
  })
);

module.exports = router;
