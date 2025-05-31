// import Paciente from "../models/paciente.model.js";
// import Familiar from "../models/Familiar.js";
// import Usuario from "../models/usuario.model.js";
import { models } from "../models/index.js";
const { Paciente, Familiar, Usuario } = models;
import { generarCodigoQR } from "../utils/qrGenerator.js"; // Asegúrate de que esta función esté correctamente implementada

import codigoQr from "../models/codigoQr.model.js"; // Modelo 

export const generarQRPaciente = async (id_paciente, maxLength = 150) => {
  try {
    
    const paciente = await Paciente.findOne({
      where: { id_paciente },
      include: [
        {
          model: Familiar,
          as: 'familiares', 
          required: false
        },{
            model: Usuario,
            as: "usuario", // alias definido en la asociación Familiar.belongsTo(Usuario, ...)
            attributes: ["telefono_usuario"]
          }
  
      ]
    });

    if (!paciente) {
      throw new Error("Paciente no encontrado");
    }

    // Definir los datos que se incluirán en el QR (ajusta según lo que realmente necesites)
    const datosParaQR = {
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      diagnostico: paciente.diagnostico_principal,       // Asegúrate de que este campo exista en tu modelo Paciente
      autonomia: paciente.nivel_autonomia,               // Verifica que este campo esté disponible
      contacto_emergencia: (paciente.usuario && paciente.usuario.telefono_usuario) 
      ? paciente.usuario.telefono_usuario 
      : "No registrado"
    };
    const telefono = (paciente.usuario && paciente.usuario.telefono_usuario) 
                  ? paciente.usuario.telefono_usuario 
                  : "No registrado";
console.log("telefon", telefono);

  

    const qrDataUrl = await generarCodigoQR(datosParaQR, maxLength); 

    const registroCodigoQR = await codigoQr.create({
      id_paciente,
      codigo: qrDataUrl
    });

    return registroCodigoQR;
  } catch (error) {
    console.error("Error generando el código QR para el paciente:", error);
    throw error;
  }
};

//actualizar informaciuon

export const actualizarPacienteQR = async (req, res) => {
  try {
    // const { id_paciente } = req.params;
    // const {
    //   nombre,
    //   apellido,
    //   diagnostico_principal,
    //   nivel_autonomia
    // } = req.body;

    // const paciente = await Paciente.findByPk(id_paciente, {
    //   include: [{
    //     model: Familiar,
    //     as: 'familiares',
    //     required: false
    //   }]
    // });

    // if (!paciente) {
    //   return res.status(404).json({ message: "Paciente no encontrado" });
    // }

    // // Actualizar todos los campos relevantes
    // await paciente.update({
    //   nombre,
    //   apellido,
    //   diagnostico_principal,
    //   nivel_autonomia
    // });

    const { id_paciente } = req.params;
    const paciente = await Paciente.findOne({
        where: { id_paciente },
        include: [
          {
            model: Familiar,
            as: 'familiares', 
            required: false
          },{
              model: Usuario,
              as: "usuario", // alias definido en la asociación Familiar.belongsTo(Usuario, ...)
              attributes: ["telefono_usuario"]
            }
        ]
      });
  
    if (!paciente) {
        throw new Error("Paciente no encontrado");
    }
    // Generar nuevo QR con datos actualizados de emergencia
    const datosParaQR = {
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        diagnostico: paciente.diagnostico_principal,       
        autonomia: paciente.nivel_autonomia,  
        contacto_emergencia: (paciente.usuario && paciente.usuario.telefono_usuario) 
        ? paciente.usuario.telefono_usuario 
        : "No registrado"
      };
      
    const qr = await generarCodigoQR(datosParaQR, 200); // DataURL base64

    const actQr = await codigoQr.update(
      { codigo: qr }, // Actualiza el código QR
      { where: { id_paciente } } // Condición para la actualización
    );

    res.status(200).json({
      message: "Qr actualizado correctamente",
      qr
    });
  } catch (error) {
    console.error("Error al actualizar codigo Qr del paciente:", error);
    res.status(500).json({
      message: "Error al actualizar paciente",
      error: process.env.NODE_ENV === "development" ? error.message : null
    });
  }
};