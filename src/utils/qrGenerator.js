import QRCode from "qrcode";

export const generarCodigoQR = async (data) => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data));
  } catch (error) {
    console.error("Error generando el código QR:", error);
    throw error;
  }
};
