import mongoose from '../db.js';

const logSchema = new mongoose.Schema({
  mensaje: String,
  numero: String,
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model('Log', logSchema);
