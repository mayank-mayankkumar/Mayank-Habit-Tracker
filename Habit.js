const mongoose = require('mongoose');

/**
 * Habit Schema
 * ──────────────────────────────────────────────────────────────
 * One document per habit per user.
 * Compound index (userId + order) speeds up sorted list queries.
 */
const habitSchema = new mongoose.Schema(
  {
    userId:   {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    name:     { type: String, required: true, trim: true, maxlength: 80 },
    emoji:    { type: String, default: '⭐', maxlength: 8 },
    category: {
      type:    String,
      enum:    ['health', 'study', 'work', 'discipline'],
      default: 'discipline',
    },
    goal:     { type: Number, default: 1, min: 1, max: 5 },
    order:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    aiGenerated: { type: Boolean, default: false },
    aiGoal:      { type: String, default: '' },  // the user goal text that generated this
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(_, obj) { delete obj.__v; return obj; } },
  }
);

// Compound index: get all habits for a user, sorted
habitSchema.index({ userId: 1, order: 1 });
habitSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Habit', habitSchema);
