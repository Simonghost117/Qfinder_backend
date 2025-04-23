import { DataTypes } from 'sequelize';
import  sequelize  from '../config/db.js';
import { NotificacionesService } from '../services/notificaciones.service.js';

export const EpisodioSalud = sequelize.define('episodio_salud', {
    id_episodio: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_paciente: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM(
            'crisis_psiquiatrica', 
            'crisis_epileptica', 
            'recaida', 
            'hospitalizacion', 
            'observacion',
            'datos_dispositivo'
        ),
        allowNull: false
    },
    fecha_hora_inicio: {
        type: DataTypes.DATE,
        allowNull: false
    },
    fecha_hora_fin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    severidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 10
        }
    },
    sintomas: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('sintomas');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('sintomas', JSON.stringify(value));
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    intervenciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    multimedia: {
        type: DataTypes.STRING,
        allowNull: true
    },
    registrado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    registrado_por_role: {
        type: DataTypes.ENUM('Medico', 'Familiar', 'Administrador', 'Sistema'),
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            'pendiente_revision',
            'en_proceso',
            'resuelto',
            'cancelado',
            'confirmado'
        ),
        defaultValue: 'pendiente_revision'
    },
    origen: {
        type: DataTypes.ENUM('cuidador', 'medico', 'sistema', 'administrador'),
        allowNull: false
    },
    fuente_datos: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'episodio_salud',
    hooks: {
       
    }
});
 // afterCreate: async (episodio) => {
        //     const notificacionService = new NotificacionesService();
            
        //     if (episodio.origen === 'cuidador') {
        //         await notificacionService.notificarMedico(episodio);
        //     } else if (episodio.origen === 'sistema' && episodio.severidad >= 7) {
        //         await notificacionService.notificarUrgencia(episodio);
        //     }
        // }
// Relaciones
