import mongoose from 'mongoose';

const RSVPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['yes', 'no'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const ScorecardCommentarySchema = new mongoose.Schema({
  ball: { type: String, required: true },
  runs: { type: Number, default: 0 },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ActiveBatsmanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
});

const ActiveBowlerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  runsConceded: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
});

const BatsmanStatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  status: { type: String, enum: ['batting', 'out', 'yet_to_bat'], default: 'yet_to_bat' },
  dismissalInfo: { type: String, default: 'not out' },
});

const BowlerStatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  runsConceded: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
});

const ScorecardSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed'],
    default: 'scheduled',
  },
  battingTeam: { type: String, default: 'Team A' },
  bowlingTeam: { type: String, default: 'Team B' },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 }, // 0 to 5
  target: { type: Number, default: 0 },
  activeStriker: { type: ActiveBatsmanSchema, default: null },
  activeNonStriker: { type: ActiveBatsmanSchema, default: null },
  activeBowler: { type: ActiveBowlerSchema, default: null },
  batsmenStats: [BatsmanStatSchema],
  bowlersStats: [BowlerStatSchema],
  commentary: [ScorecardCommentarySchema],
});

const MatchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a match title'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Please provide a match date'],
  },
  time: {
    type: String,
    required: [true, 'Please provide a match time / duration'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Please provide a location / stadium details'],
    trim: true,
  },
  totalCost: {
    type: Number,
    required: [true, 'Please provide the total organizational cost of the match'],
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  rsvps: [RSVPSchema],
  scorecard: {
    type: ScorecardSchema,
    default: () => ({
      status: 'scheduled',
      battingTeam: 'Team A',
      bowlingTeam: 'Team B',
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      target: 0,
      commentary: [],
    }),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
