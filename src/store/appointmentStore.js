import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useAppointmentStore = create(
  (set) => ({
    appointments: [],
    isLoading: false,

    fetchAppointments: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;

        if (data) {
          const mapped = data.map(a => ({
            ...a,
            customerName: a.customer_name || a.owner_name || a.ownerName,
            petName: a.pet_name || a.petName,
            petType: a.pet_type || a.petType
          }));
          set({ appointments: mapped });
        }
      } catch (err) {
        console.error('Erro ao carregar agendamentos do Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addAppointment: async (appointment) => {
      const id = crypto.randomUUID();

      const dataForDb = {
        id,
        customer_name: appointment.customerName || appointment.name || appointment.customCustomerName || 'Cliente',
        phone: appointment.phone || appointment.customPhone || '',
        pet_name: appointment.petName || appointment.pet_name || appointment.customPetName || 'Pet',
        pet_type: appointment.petType || appointment.pet_type || 'Cachorro',
        service: appointment.service || appointment.serviceType || 'Consulta',
        date: appointment.date || (appointment.dateTime ? appointment.dateTime.split('T')[0] : new Date().toISOString().split('T')[0]),
        time: (appointment.time && appointment.time.length >= 5)
          ? appointment.time
          : (appointment.dateTime && appointment.dateTime.includes('T') ? appointment.dateTime.split('T')[1].substring(0, 5) : '09:00'),
        status: appointment.status || 'Pendente',
        observations: appointment.observations || appointment.notes || ''
      };

      try {
        const { error } = await supabase.from('appointments').insert([dataForDb]);
        if (error) {
          console.error('Erro detalhado Supabase (appointments):', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        set((state) => ({ appointments: [...state.appointments, { ...appointment, ...dataForDb }] }));
      } catch (err) {
        console.error('Erro ao persistir agendamento no Supabase:', err);
        throw err;
      }
    },

    updateAppointment: async (id, updated) => {
      const dataForDb = {
        customer_name: updated.customerName,
        phone: updated.phone,
        pet_name: updated.petName,
        pet_type: updated.petType,
        service: updated.service,
        date: updated.date,
        time: updated.time,
        status: updated.status
      };

      try {
        const { error } = await supabase.from('appointments').update(dataForDb).eq('id', id);
        if (error) throw error;

        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...updated } : a))
        }));
      } catch (err) {
        console.error('Erro ao atualizar agendamento no Supabase:', err);
      }
    },

    deleteAppointment: async (id) => {
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar agendamento no Supabase:', err);
      }
    }
  })
);
