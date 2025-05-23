import QRCode from "qrcode";

export const generarCodigoQR = async (data, maxLength = 200) => {
  try {
    let jsonData = JSON.stringify(data);

    // Limitar la cantidad de caracteres en el JSON
    if (jsonData.length > maxLength) {
      jsonData = jsonData.substring(0, maxLength); // 🔹 Truncar a la longitud deseada
    }

    return await QRCode.toDataURL(jsonData);
  } catch (error) {
    console.error("Error generando el código QR:", error);
    throw error;
  }
};