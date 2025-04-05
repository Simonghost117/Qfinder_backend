import { EpisodioSaludService } from '../services/episodioSalud.service.js';
import { NotificacionesService } from '../services/notificaciones.service.js';
import { handleError } from '../utils/errorHandler.js';
//import { Familiar } from '../models/Familiar.js';
//import { Paciente } from '../models/Paciente.js';

export class ReporteSaludController {
    static async registrarObservacion(req, res) {
        try {
            const { id_paciente } = req.params;
            const { sintomas, descripcion, severidad } = req.body;
            
            // Verificar relación familiar-paciente
            const familiar = await Familiar.findOne({
                where: {
                    id_usuario: req.user.id_usuario,
                    id_paciente: id_paciente
                },
                include: [{
                    model: Paciente,
                    attributes: ['id_paciente', 'nombre', 'apellido']
                }]
            });

            if (!familiar) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para registrar observaciones de este paciente'
                });
            }

            const reporte = await EpisodioSaludService.crearEpisodio({
                id_paciente,
                tipo: 'observacion',
                fecha_hora_inicio: new Date(),
                severidad: severidad || 3,
                sintomas: JSON.parse(sintomas),
                descripcion,
                registrado_por: req.user.id_usuario,
                registrado_por_role: 'Familiar',
                estado: 'pendiente_revision',
                origen: 'cuidador',
                paciente: familiar.Paciente // Para relaciones en notificaciones
            });

            res.status(201).json({
                success: true,
                message: 'Observación registrada. El médico ha sido notificado.',
                data: reporte
            });
        } catch (error) {
            handleError(res, error);
        }
    }

    static async registrarDatosSistema(req, res) {
        try {
            const { id_paciente } = req.params;
            const { tipo_dispositivo, datos } = req.body;

            // Verificar que el paciente existe
            const paciente = await Paciente.findByPk(id_paciente);
            if (!paciente) {
                return res.status(404).json({
                    success: false,
                    message: 'Paciente no encontrado'
                });
            }

            // Procesar datos según tipo de dispositivo
            let sintomas = [];
            let severidad = 3;
            let tipoEpisodio = 'datos_dispositivo';

            switch (tipo_dispositivo) {
                case 'smartwatch':
                    if (datos.heartRate > 120) {
                        sintomas.push('taquicardia');
                        severidad = 5;
                    }
                    if (datos.fallDetected) {
                        sintomas.push('caida');
                        severidad = 7;
                        tipoEpisodio = 'crisis_epileptica';
                    }
                    break;
                case 'monitor_convulsiones':
                    if (datos.eventDetected) {
                        sintomas.push('convulsiones');
                        severidad = 8;
                        tipoEpisodio = 'crisis_epileptica';
                    }
                    break;
                default:
                    sintomas.push('evento_detectado');
            }

            const reporte = await EpisodioService.crearEpisodio({
                id_paciente,
                tipo: tipoEpisodio,
                fecha_hora_inicio: new Date(datos.timestamp || Date.now()),
                severidad,
                sintomas,
                descripcion: `Datos de ${tipo_dispositivo}: ${JSON.stringify(datos)}`,
                registrado_por: null,
                registrado_por_role: 'Sistema',
                estado: severidad >= 7 ? 'pendiente_revision' : 'por_revisar',
                origen: 'sistema',
                fuente_datos: tipo_dispositivo,
                paciente // Para relaciones en notificaciones
            });

            res.status(201).json({
                success: true,
                message: 'Datos del dispositivo registrados',
                data: reporte
            });
        } catch (error) {
            handleError(res, error);
        }
    }
}