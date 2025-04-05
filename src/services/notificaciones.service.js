import { Familiar } from '../models/index.js';
import { transporter } from '../config/email.js';

export class NotificacionesService {
    /**
     * Notifica solo a los cuidadores/familiares del paciente
     */
    async notificarCuidadores(episodio) {
        try {
            // Obtener lista de cuidadores del paciente
            const cuidadores = await this._obtenerCuidadores(episodio.id_paciente);
            
            // Enviar notificación a cada cuidador
            for (const cuidador of cuidadores) {
                await this._enviarEmail(
                    cuidador.correo_usuario,
                    'Nueva alerta de salud',
                    this._crearMensajeAlerta(episodio)
                );
            }
        } catch (error) {
            console.error('Error en notificación:', error);
            // Puedes agregar aquí un sistema de reintentos o logging
        }
    }

    // Métodos auxiliares privados
    async _obtenerCuidadores(id_paciente) {
        // Obtiene los familiares/cuidadores del paciente con su info de usuario
        const familiares = await Familiar.findAll({
            where: { id_paciente },
            include: [{
                association: 'usuario', // Asume que existe esta relación
                attributes: ['id_usuario', 'correo_usuario', 'nombre_usuario']
            }]
        });
        
        return familiares.map(f => f.usuario);
    }

    async _enviarEmail(destinatario, asunto, contenido) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Sistema de Cuidado" <notificaciones@cuidado.com>',
                to: destinatario,
                subject: asunto,
                html: contenido
            });
        } catch (error) {
            console.error(`Error enviando email a ${destinatario}:`, error);
        }
    }

    _crearMensajeAlerta(episodio) {
        return `
            <h2>Nueva alerta de salud</h2>
            <p>Se ha registrado un nuevo evento para la persona que cuidas:</p>
            <ul>
                <li><strong>Tipo:</strong> ${episodio.tipo}</li>
                <li><strong>Síntomas:</strong> ${episodio.sintomas.join(', ')}</li>
                <li><strong>Severidad:</strong> ${episodio.severidad}/10</li>
                <li><strong>Descripción:</strong> ${episodio.descripcion}</li>
            </ul>
            <p>Por favor inicia sesión en la plataforma para más detalles.</p>
        `;
    }
}