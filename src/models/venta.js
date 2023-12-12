const mongoose = require("mongoose");
const { Schema } = mongoose;

const ventaSchema = new Schema(
  {
    productos: [
      {
        type: Schema.Types.ObjectId,
        ref: "producto",
      },
    ],
    totalVenta: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("venta", ventaSchema);
