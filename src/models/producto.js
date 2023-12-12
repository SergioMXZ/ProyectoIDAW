const mongoose = require("mongoose");
const { Schema } = mongoose;

const productoSchema = new Schema(
  {
    nombre: {
      type: String,
      require: true,
      trim: true,
    },
    descripcion: {
      type: String,
      require: true,
    },
    codigo: {
      type: Number,
      require: true,
    },
    precio: {
      type: Number,
      require: true,
    },
    cantidad: {
      type: Number,
      require: true,
    },
    total: {
      type: Number,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("producto", productoSchema);
