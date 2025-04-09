import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Puedes restringir a tu frontend si deseas
    },
  });

  io.on("connection", (socket) => {
    console.log("Usuario conectado:", socket.id);

    socket.on("disconnect", () => {
      console.log("Usuario desconectado:", socket.id);
    });

    // Ejemplo de evento personalizado
    socket.on("nueva-actividad", (data) => {
      console.log("Actividad recibida:", data);
      io.emit("actividad-actualizada", data);
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado.");
  }
  return io;
};
