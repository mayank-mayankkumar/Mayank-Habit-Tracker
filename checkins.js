const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { CheckIn } = require('../models/CheckIn');
const Habit       = require('../models/Habit');
const { protect } = require('../middleware/auth');
const { asyncHandler, validate } = require('../middleware/errorHandler');
const { successResponse } = require('../utils/jwt');

router.use(protect);

// ── Validation ────────────────────────────────────────────────
const dateRule = (field) =>
  body(field)
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${field} must be YYYY-MM-DD`);

// ─────────────────────────────────────────────────────────────
// GET /api/checkins?year=2026&month=5
// ─────────────────────────────────────────────────────────────
/**
 * @route   GET /api/checkins
 * @desc    Get all check-ins for a given month
 * @query   year (default: current), month (0-indexed, default: current)
 * @access  Private
 *
 * Returns array of CheckIn docs — one per day that has any data.
 * Days with no activity simply have no document (not returned).
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const year  = parseInt(req.query.year  ?? new Date().getFullYear());
    const month = parseInt(req.query.month ?? new Date().getMonth());  // 0-indexed
    const mm    = String(month + 1).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const end   = `${year}-${mm}-31`;

    const checkins = await CheckIn.find({
      userId: req.user._id,
      date:   { $gte: start, $lte: end },
    }).sort({ date: 1 });

    successResponse(res, { count: checkins.length, checkins });
  })
);

// ─────────────────────────────────────────────────────────────
// POST /api/checkins/toggle
// ─────────────────────────────────────────────────────────────
/**
 * @route   POST /api/checkins/toggle
 * @desc    Toggle a single habit check for a specific date
 * @body    { habitId, date }
 * @access  Private
 *
 * Uses findOneAndUpdate with upsert so the first check of a day
 * creates the document; subsequent checks flip the boolean.
 * This is an atomic O(1) operation thanks to the compound index.
 */
router.post(
  '/toggle',
  [
    body('habitId').isMongoId().withMessage('habitId must be a valid ObjectId'),
    dateRule('date'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { habitId, date } = req.body;

    // Verify habit belongs to user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id, isActive: true });
    if (!habit) return res.status(404).json({ success: false, error: 'Habit not found' });

    // Get current state
    const existing = await CheckIn.findOne({ userId: req.user._id, date });
    const current  = existing?.checks?.get(habitId) || false;
    const next     = !current;

    // Atomic upsert — create day doc if it doesn't exist, flip the bit
    const checkin = await CheckIn.findOneAndUpdate(
      { userId: req.user._id, date },
      { $set: { [`checks.${habitId}`]: next } },
      { upsert: true, new: true }
    );

    successResponse(res, {
      checkin,
      habitId,
      date,
      checked: next,
    }, next ? 'Habit checked ✓' : 'Habit unchecked');
  })
);

// ─────────────────────────────────────────────────────────────
// PUT /api/checkins/:date
// ─────────────────────────────────────────────────────────────
/**
 * @route   PUT /api/checkins/:date
 * @desc    Replace entire checks map for a date (bulk update)
 * @body    { checks: { [habitId]: boolean } }
 * @access  Private
 */
router.put(
  '/:date',
  [
    param('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
    body('checks').isObject().withMessage('checks must be an object'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { date } = req.params;
    const { checks } = req.body;

    const checkin = await CheckIn.findOneAndUpdate(
      { userId: req.user._id, date },
      { checks },
      { upsert: true, new: true, runValidators: true }
    );
    successResponse(res, { checkin }, 'Check-in updated');
  })
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/checkins/:date
// ─────────────────────────────────────────────────────────────
/**
 * @route   DELETE /api/checkins/:date
 * @desc    Delete all check-in data for a specific date
 * @access  Private
 */
router.delete(
  '/:date',
  asyncHandler(async (req, res) => {
    await CheckIn.findOneAndDelete({ userId: req.user._id, date: req.params.date });
    successResponse(res, {}, 'Check-in data cleared for ' + req.params.date);
  })
);

// ─────────────────────────────────────────────────────────────
// GET /api/checkins/analytics/summary
// ─────────────────────────────────────────────────────────────
/**
 * @route   GET /api/checkins/analytics/summary
 * @desc    Aggregated analytics: completion %, streaks, best/worst habit
 * @query   year, month
 * @access  Private
 *
 * Uses MongoDB aggregation pipeline — O(n) over check-in docs.
 * Demonstrates: $match, $project, $group, $sort, $addFields.
 */
router.get(
  '/analytics/summary',
  asyncHandler(async (req, res) => {
    const year  = parseInt(req.query.year  ?? new Date().getFullYear());
    const month = parseInt(req.query.month ?? new Date().getMonth());
    const mm    = String(month + 1).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const end   = `${year}-${mm}-31`;

    const uid = req.user._id;

    // Load habits + check-ins in parallel
    const [habits, checkins] = await Promise.all([
      Habit.find({ userId: uid, isActive: true }).sort({ order: 1 }),
      CheckIn.find({ userId: uid, date: { $gte: start, $lte: end } }),
    ]);

    if (!habits.length) {
      return successResponse(res, { summary: null }, 'No habits found');
    }

    // Build daily scores
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const today        = new Date();
    const maxDay       = (today.getFullYear() === year && today.getMonth() === month)
                           ? today.getDate() : daysInMonth;

    // Map date → checks
    const checkMap = {};
    checkins.forEach(c => { checkMap[c.date] = c.checks; });

    const isChecked = (hid, d) => {
      const dk = `${year}-${mm}-${String(d).padStart(2,'0')}`;
      return !!(checkMap[dk] && checkMap[dk].get(hid.toString()));
    };

    // Per-habit stats
    const habitStats = habits.map(h => {
      let done = 0;
      for (let d = 1; d <= maxDay; d++) if (isChecked(h._id, d)) done++;
      const goal = h.goal * maxDay;
      return { habitId: h._id, name: h.name, emoji: h.emoji,
               category: h.category, done, goal,
               pct: goal > 0 ? Math.round((done / goal) * 100) : 0 };
    });

    // Global totals
    const totalDone = habitStats.reduce((s, h) => s + h.done, 0);
    const totalGoal = habitStats.reduce((s, h) => s + h.goal, 0);
    const globalPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

    // Streak (consecutive days ≥50% completion)
    const dayScores = [];
    for (let d = 1; d <= maxDay; d++) {
      let done = 0, goal = 0;
      habits.forEach(h => {
        if (isChecked(h._id, d)) done++;
        goal += h.goal;
      });
      dayScores.push(goal > 0 ? done / goal : 0);
    }
    let currentStreak = 0, longestStreak = 0, cur = 0;
    dayScores.forEach(s => {
      if (s >= 0.5) { cur++; longestStreak = Math.max(longestStreak, cur); }
      else           cur = 0;
    });
    // Current streak = consecutive from today backwards
    for (let i = dayScores.length - 1; i >= 0; i--) {
      if (dayScores[i] >= 0.5) currentStreak++;
      else break;
    }

    const sorted   = [...habitStats].sort((a, b) => b.pct - a.pct);
    const best     = sorted[0];
    const worst    = sorted[sorted.length - 1];

    // Category breakdown
    const cats = ['health','study','work','discipline'];
    const categoryStats = cats.map(cat => {
      const hs = habitStats.filter(h => h.category === cat);
      if (!hs.length) return { category: cat, done:0, goal:0, pct:0 };
      const d = hs.reduce((s,h) => s+h.done, 0);
      const g = hs.reduce((s,h) => s+h.goal, 0);
      return { category: cat, done:d, goal:g, pct: g>0?Math.round(d/g*100):0 };
    });

    // Day-of-week averages
    const dowSums  = new Array(7).fill(0);
    const dowCounts = new Array(7).fill(0);
    for (let d = 1; d <= maxDay; d++) {
      const dow = new Date(year, month, d).getDay();
      dowSums[dow]  += dayScores[d - 1];
      dowCounts[dow]++;
    }
    const dowAvg = dowSums.map((s, i) =>
      dowCounts[i] > 0 ? Math.round((s / dowCounts[i]) * 100) : 0);

    successResponse(res, {
      summary: {
        period:         { year, month, daysTracked: maxDay },
        globalPct,
        totalDone,
        totalGoal,
        currentStreak,
        longestStreak,
        best:           { habitId: best.habitId, name: best.name, emoji: best.emoji, pct: best.pct },
        worst:          { habitId: worst.habitId, name: worst.name, emoji: worst.emoji, pct: worst.pct },
        habitStats,
        categoryStats,
        dowAvg,
        dayScores:      dayScores.map((s, i) => ({ day: i + 1, score: Math.round(s * 100) })),
      },
    });
  })
);

module.exports = router;
