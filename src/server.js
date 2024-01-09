// Importación de módulos
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const server = express();
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const passport = require("passport");
const helpers = require("./helpers/auth");
const Venta = require("./models/venta");
const Producto = require("./models/producto");
const PdtoCatalogo = require("./models/pdtoCatalogo");

// Variables globales
var addedProducts = [];
var deQuitar = false;
var scroll = false;

// Configuración de Passport
require("./passport/local-auth");

const path = require("path");

// Configuración de directorios para las vistas
server.set("views", path.join(__dirname, "views"));
server.set("view engine", "ejs");

// Configuración para el manejo de datos JSON
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

//Establecer conexion con base de datos
mongoose
  .connect("mongodb://localhost:27017/punto-venta")
  .then(() => {
    console.log(">>> Conexion bd establecida");
  })
  .catch((error) => {
    console.error("Error de conexion bd", error);
  });

// Esto registra los errores despues la conexion
const db = mongoose.connection;
db.on('error', (error) => {
  console.error(error, "¡Intenta iniciar el servicio MongoDB!");
});

// ------------------------ Middlewares ------------------------

// Configuración para el manejo de datos de formularios
server.use(express.urlencoded({ extended: false }));

// Configuracion de express-session
server.use(
  session({
    secret: "mysecretsession",
    cookie: { _expires: 24 * 60 * 60 * 1000 }, // 1 dia
    resave: false,
    saveUninitialized: false,
  })
);

// Configuracion de connect-flash
server.use(flash());

// Configuración de Passport
server.use(passport.initialize());
server.use(passport.session());

// Configuración para servir archivos estáticos desde la carpeta 'public'
server.use("/public", express.static(path.join(__dirname, "public")));

// Configuración del puerto
const port = 3000;

// Habilitar el servidor
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// ------------------------ Rutas ------------------------

// Ruta para cerrar sesión
server.get("/logout", (req, res, next) => {
  req.session.destroy();
  res.redirect("/");
});

// Ruta principal (página de inicio o login)
server.get("/", (req, res, next) => {
  var title = "Login";
  const successMessages = req.flash("success"); // Mensajes de éxito
  const messages = req.flash("error");
  res.render("index", { title: title, messages, successMessages });
});

// Ruta para registrarse
server.get("/signup", (req, res, next) => {
  var title = "Register";
  const messages = req.flash("error"); // Mensajes de error por fallo de autenticación
  const successMessages = req.flash("success"); // Mensajes de éxito
  res.render("signup", { title: title, messages, successMessages });
});

// Manejo del formulario de registro
server.post(
  "/signup",
  passport.authenticate("local-signup", {
    successRedirect: "/",
    failureRedirect: "/signup",
    failureFlash: true,
    successFlash: "Bienvenido de nuevo.",
  })
);

// Manejo del formulario de inicio de sesión
server.post(
  "/signin",
  passport.authenticate("local-signin", {
    successRedirect: "/collection-form",
    failureRedirect: "/signin",
    failureFlash: true,
    successFlash: "Bienvenido de nuevo.",
  })
);

// Redirección a la página de inicio
server.get("/signin", (req, res, next) => {
  res.redirect("/");
});

// Página principal del formulario de colección
server.get("/collection-form", helpers.isLoggedIn, (req, res, next) => {
  scroll = deQuitar == false ? false : scroll;
  // Si viene de la ruta quitar no se reinicia la rista solo se recarga la pagina
  addedProducts = deQuitar == true ? addedProducts : [];
  deQuitar = false;
  var title = "Collection form";
  PdtoCatalogo.find().then((resultado) => {
    res.render("collection-form", {
      pdtoCatalogo: resultado,
      title: title,
      addedProducts,
      scroll,
    });
  });
});

// Página de gestión de catálogo
server.get("/catalog", helpers.isLoggedIn, (req, res, next) => {
  var title = "Catalog Management";
  PdtoCatalogo.find().then((resultado) => {
    res.render("catalog", {
      pdtoCatalogo: resultado,
      title: title,
    });
  });
});

// Página para crear un nuevo producto
server.get("/crearProducto", helpers.isLoggedIn, (req, res) => {
  const messages = req.flash("error"); // Mensajes de error por fallo
  res.render("crearProducto", { messages });
});

// Manejo de la creación de un nuevo producto
server.post("/crearProducto", helpers.isLoggedIn, async (req, res) => {
  const { nombre, descripcion, precio } = req.body;
  const nuevoNombre = nombre;
  // Ver que el nombre no sea igual a otro ya existente
  const producto = await PdtoCatalogo.findOne({ nombre: nuevoNombre });
  if (producto) {
    req.flash("error", "The product name already exists.");
    return res.redirect("/crearProducto");
  }

  try {
    // Obtener el código de manera asíncrona
    const obtenerCodigo = async () => {
      try {
        let nuevoCodigo = await PdtoCatalogo.countDocuments().exec();
        let codigoUnicoEncontrado = false;
        // Asegurarse de que el valor retornado sea mayor o igual a 1
        nuevoCodigo =
          typeof nuevoCodigo === "number" && nuevoCodigo > 0
            ? nuevoCodigo + 1
            : 1;
        do {
          // Verificar si el nuevo codigo ya existe en el catálogo
          const existeCodigo = await PdtoCatalogo.exists({
            codigo: nuevoCodigo,
          });

          // Si el código ya existe, intenta con el siguiente sumando 1
          if (existeCodigo) {
            nuevoCodigo++;
          } else {
            // Si el código no existe, es un codigo unico y termina el bucle
            codigoUnicoEncontrado = true;
          }
        } while (!codigoUnicoEncontrado);

        return nuevoCodigo;
      } catch (error) {
        throw error;
      }
    };

    // Obtener el próximo código
    const codigo = await obtenerCodigo();

    // Crea un nuevo producto utilizando el modelo
    const nuevoProducto = new PdtoCatalogo({
      nombre: nombre,
      descripcion: descripcion,
      precio: precio,
      codigo: codigo,
    });

    // Guardar el nuevo producto en la base de datos
    await nuevoProducto.save();

    res.redirect("/catalog");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Página para editar un producto
server.get("/editar/:codigo", helpers.isLoggedIn, async (req, res) => {
  const codigoProducto = req.params.codigo;
  const messages = req.flash("error"); // Mensajes de error por fallo
  try {
    // Lógica para recuperar los detalles del producto con el código
    const productoObtenido = await PdtoCatalogo.findOne({
      codigo: codigoProducto,
    });

    if (!productoObtenido) {
      return res.status(404).send("Producto no encontrado");
    }

    // Renderizar la página de edición con los detalles del producto
    res.render("editarProducto", { producto: productoObtenido, messages });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Manejo de la actualización de un producto después de la edición
server.post("/editar/:codigo", helpers.isLoggedIn, async (req, res) => {
  const codigoProducto = req.params.codigo;
  const { nombre, descripcion, precio } = req.body;
  const nuevoNombre = nombre;

  // Ver que el nombre no sea igual a otro ya existente
  const producto = await PdtoCatalogo.findOne({ nombre: nuevoNombre });
  // Envia un error si se encuentra el nombre y es diferente al de este codigo
  if (producto && producto.codigo != codigoProducto) {
    req.flash("error", "The product name already exists.");
    return res.redirect("/editar/" + codigoProducto);
  }

  try {
    // Encuentra el producto por su código
    const producto = await PdtoCatalogo.findOne({ codigo: codigoProducto });

    if (!producto) {
      return res.status(404).send("Producto no encontrado");
    }

    // Actualiza los detalles del producto con los valores del formulario
    producto.nombre = nombre;
    producto.descripcion = descripcion;
    producto.precio = precio;

    // Guarda el producto actualizado en la base de datos
    await producto.save();

    // Redirige a la página de lista de productos
    res.redirect("/catalog");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para eliminar un producto
server.get("/borrar/:codigo", helpers.isLoggedIn, async (req, res) => {
  const codigoProducto = req.params.codigo;

  try {
    // Encuentra y elimina el producto con el código
    const resultado = await PdtoCatalogo.deleteOne({ codigo: codigoProducto });

    // Redirige a la página de lista de productos después del borrado
    res.redirect("/catalog");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para agregar un producto al carrito
server.post("/addProduct/:codigo", helpers.isLoggedIn, async (req, res) => {
  const codProducto = req.params.codigo;
  // Obtener la cantidad del formulario
  const cantidad = parseInt(req.body.cantidad);
  deQuitar = true;
  scroll = false;

  try {
    // Lógica para recuperar los detalles del producto con el código
    const productoAdd = await PdtoCatalogo.findOne({
      codigo: codProducto,
    });

    addedProducts.push({
      nombre: productoAdd.nombre,
      descripcion: productoAdd.descripcion,
      codigo: productoAdd.codigo,
      precio: productoAdd.precio,
      cantidad: cantidad,
      total: cantidad * productoAdd.precio,
    });

    // Si se encuentra repetido en la lista de addedProducts su cantidad y precio
    // se suman al del producto y ya no se agrega al nuevo array
    let sinRepetir = [];
    addedProducts.forEach((pdto) => {
      let existente = sinRepetir.find((o) => o.codigo === pdto.codigo);
      if (existente) {
        existente.cantidad += pdto.cantidad;
        existente.total += pdto.total;
      } else {
        sinRepetir.push({ ...pdto }); //crea un nuevo objeto que copia todas las propiedades
      }
      addedProducts = sinRepetir;
    });

    res.redirect("/collection-form");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para cancelar la acción de agregar un producto
server.get("/cancelar", (req, res) => {
  scroll = false;
  res.redirect("/collection-form");
});

// Ruta para quitar un producto del carrito
server.get("/remove/:index", helpers.isLoggedIn, (req, res) => {
  const index = req.params.index;
  deQuitar = true;
  scroll = true;
  try {
    addedProducts.splice(index, 1);
    res.redirect("/collection-form");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para realizar la compra de los productos en el carrito
server.get("/buy-products", helpers.isLoggedIn, async (req, res) => {
  // Crea una nueva venta
  let nuevaVenta = new Venta();
  nuevaVenta.totalVenta = 0;
  // Crea y guarda cada producto en la base de datos, y luego agrega el producto a la venta
  for (let pdto of addedProducts) {
    let nuevoProducto = new Producto({
      nombre: pdto.nombre,
      descripcion: pdto.descripcion,
      codigo: pdto.codigo,
      precio: pdto.precio,
      cantidad: pdto.cantidad,
      total: pdto.total,
    });
    await nuevoProducto.save(); // Guarda el producto
    nuevaVenta.totalVenta += pdto.total; // Agrega el total a la venta
    nuevaVenta.productos.push(nuevoProducto._id); // Agrega a la venta el producto
  }
  await nuevaVenta.save();

  try {
    res.redirect("/collection-form");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Página de lista de ventas
server.get("/sales-list", helpers.isLoggedIn, async (req, res, next) => {
  try {
    var title = "Sales list";

    // Aquí podrías obtener todas las ventas o las que desees mostrar inicialmente
    const ventas = await Venta.find().populate("productos");

    res.render("sales-list", { title: title, ventas: ventas });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para buscar ventas por fecha
server.post("/buscarVentas", helpers.isLoggedIn, async (req, res) => {
  try {
    // Convierte la fecha a un objeto Date
    // y se obtine cuando inicia y termina el dia
    const fechaInicio = moment(req.body.fecha).startOf("day").toDate();
    const fechaFin = moment(req.body.fecha).endOf("day").toDate();

    // Realiza la búsqueda en la base de datos de ventas que coincidan y se trae a sus productos
    const ventas = await Venta.find({
      createdAt: { $gte: fechaInicio, $lt: fechaFin },
    }).populate("productos");

    var title = "Sales list";
    res.render("sales-list", { title: title, ventas: ventas });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
});
// ----fin----
