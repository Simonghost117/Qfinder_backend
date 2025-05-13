import CitaMedica from '../models/cita_medica.js';

export const crearCitaMedica = async (req, res) => {
    try {
        const { id_paciente } = req.params; 
        const { fecha_cita, motivo_cita, resultado_consulta, estado_cita } = req.body;
    
        const nuevaCita = await CitaMedica.create({
        id_paciente,
        fecha_cita,
        motivo_cita,
        resultado_consulta,
        estado_cita
        });
    
        res.status(201).json(nuevaCita);
    } catch (error) {
        console.error('Error al crear la cita médica:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
    }

    export const listarCitasMedicas = async (req, res) => {
        try {
            const { id_paciente } = req.params; 
            const citas = await CitaMedica.findAll({
                where: { id_paciente },
                order: [['fecha_cita', 'DESC']]
            });
    
            res.status(200).json(citas);
        } catch (error) {
            console.error('Error al listar las citas médicas:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    export const listarCitasMedicasId = async (req, res) => {
        try {
            const { id_paciente, id_cita } = req.params; 
            const citas = await CitaMedica.findAll({
                where: { id_paciente, id_cita },
                order: [['fecha_cita', 'DESC']]
            });
            if (citas.length === 0) {
                return res.status(404).json({ message: 'Cita médica no encontrada' });
            }
    
            res.status(200).json(citas);
        } catch (error) {
            console.error('Error al listar las citas médicas:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
    export const actualizarCitaMedica = async (req, res) => {  
        try {
            const { id_paciente, id_cita } = req.params; 
            const { fecha_cita, motivo_cita, resultado_consulta, estado_cita } = req.body;
    
            const [actualizada] = await CitaMedica.update(
                { fecha_cita, motivo_cita, resultado_consulta, estado_cita },
                { where: { id_paciente, id_cita } }
            );
    
            if (actualizada) {
                res.status(200).json({ message: 'Cita médica actualizada con éxito' });
            } else {
                res.status(404).json({ message: 'Cita médica no encontrada' });
            }
        } catch (error) {
            console.error('Error al actualizar la cita médica:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
    export const eliminarCitaMedica = async (req, res) => {
        try {
            const { id_paciente, id_cita } = req.params; 
    
            const eliminada = await CitaMedica.destroy({
                where: { id_paciente, id_cita }
            });
    
            if (eliminada) {
                res.status(200).json({ message: 'Cita médica eliminada con éxito' });
            } else {
                res.status(404).json({ message: 'Cita médica no encontrada' });
            }
        } catch (error) {
            console.error('Error al eliminar la cita médica:', error);
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }