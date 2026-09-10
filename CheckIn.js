const mongoose = require('mongoose');

/**
 * CheckIn Schema
 * ──────────────────────────────────────────────────────────────
 * One document per (user, date).
 * The `checks` field is a Map of habitId → boolean.
 *
 * Key design decision:
 *   Doc ID pattern: userId_YYYY-MM-DD (stored as a unique compound index)
 *   This gives O(1) upsert for "mark habit done today".
 *   Querying a month = range scan on `date` for one userId → fast with index.
 */
const checkInSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    date: {
      type:     String,   // 'YYYY-MM-DD' — string keeps timezone-safe
      required: true,
      match:    [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    // Map<habitId (ObjectId as string), boolean>
    checks: {
      type:    Map,
      of:      Boolean,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, obj) {
        delete obj.__v;
        // Serialise Map to plain object for API consumers
        if (obj.checks instanceof Map) {
          obj.checks = Object.fromEntries(obj.checks);
        }
        return obj;
      },
    },
  }
);

// Unique constraint: one check-in document per user per day
checkInSchema.index({ userId: 1, date: 1 }, { unique: true });
// Range queries: "get all check-ins in May 2026 for user X"
checkInSchema.index({ userId: 1, date: -1 });

/**
 * Note Schema
 * ──────────────────────────────────────────────────────────────
 * One document per (user, habit, date).
 * Unique compound index: (userId, habitId, date) = O(1) upsert.
 */
const noteSchema = new mongoose.Schema(
  {
    userId:  {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    habitId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Habit',
      required: true,
    },
    date:    {
      type:     String,   // 'YYYY-MM-DD'
      required: true,
      match:    [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    text:  { type: String, maxlength: 500, default: '' },
    mood:  { type: String, maxlength: 4,   default: null },
    tags:  { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_, obj) { delete obj.__v; return obj; } },
  }
);

noteSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });
noteSchema.index({ userId: 1, date: -1 });
noteSchema.index({ userId: 1, habitId: 1, date: -1 });

const CheckIn = mongoose.model('CheckIn', checkInSchema);
const Note    = mongoose.model('Note',    noteSchema);

module.exports = { CheckIn, Note };
