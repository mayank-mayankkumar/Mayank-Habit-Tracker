const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

/**
 * User Schema
 * ──────────────────────────────────────────────────────────────
 * Indexes:
 *   email  — unique, used for login lookup
 *   All query patterns are O(1) key lookups
 */
const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, maxlength: 80 },
    email:    {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type:     String,
      required: function () { return this.provider === 'local'; },
      select:   false,          // never sent in responses
      minlength: 8,
    },
    provider:  { type: String, enum: ['local', 'google'], default: 'local' },
    googleId:  { type: String, sparse: true },
    photoURL:  { type: String, default: null },
    college:   { type: String, trim: true, maxlength: 100, default: '' },
    branch:    { type: String, trim: true, maxlength: 100, default: '' },
    bio:       { type: String, trim: true, maxlength: 500, default: '' },
    lastLogin: { type: Date, default: Date.now },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,   // adds createdAt, updatedAt automatically
    toJSON: {
      virtuals: true,
      transform(_, obj) {
        // Never leak password or __v
        delete obj.password;
        delete obj.__v;
        return obj;
      },
    },
  }
);

// ── Index ─────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });

// ── Pre-save: hash password ────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare password ─────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// ── Virtual: initials ─────────────────────────────────────────
userSchema.virtual('initials').get(function () {
  return this.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

module.exports = mongoose.model('User', userSchema);
