const mongoose = require("mongoose");
const { Schema } = mongoose;

const pdtoCatalogoSchema = new Schema({
  nombre: {
    type: String,
    require: true,
    trim: true,
    unique: true,
  },
  descripcion: {
    type: String,
    require: true,
  },
  precio: {
    type: Number,
    require: true,
  },
  codigo: {
    type: Number,
    unique: true,
    required: true,
  },
});

module.exports = mongoose.model("pdtoCatalogo", pdtoCatalogoSchema);
