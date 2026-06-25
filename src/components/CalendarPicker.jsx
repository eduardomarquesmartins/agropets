import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarPicker.css';

const CalendarPicker = ({ appointments, onDateSelect, selectedDate, allowedWeekdays }) => {
  const getInitialViewDate = () => {
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2] || 1);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState(getInitialViewDate());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const pieces = selectedDate.split('-');
    const y = parseInt(pieces[0]);
    const m = parseInt(pieces[1]);
    const d = parseInt(pieces[2]);
    
    return (
      day === d &&
      viewDate.getMonth() + 1 === m &&
      viewDate.getFullYear() === y
    );
  };

  const hasAppointment = (day) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.some(app => {
      const appDate = app.date || (app.dateTime ? app.dateTime.split('T')[0] : '');
      return appDate === dateStr;
    });
  };

  const isDisabled = (day) => {
    if (!allowedWeekdays || allowedWeekdays.length === 0) return false;
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    return !allowedWeekdays.includes(date.getDay());
  };

  const handleDateClick = (day) => {
    if (isDisabled(day)) return;
    const formattedDate = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(formattedDate);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const days = [];
  const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  // Padding for starting empty cells
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  for (let d = 1; d <= totalDays; d++) {
    const hasApp = hasAppointment(d);
    const disabled = isDisabled(d);
    days.push(
      <div
        key={d}
        className={`calendar-day ${isToday(d) ? 'today' : ''} ${isSelected(d) ? 'selected' : ''} ${hasApp ? 'has-appointment' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => handleDateClick(d)}
        title={disabled ? 'Atendimento não disponível neste dia' : ''}
      >
        <span>{d}</span>
        {hasApp && !disabled && <div className="appointment-dot"></div>}
      </div>
    );
  }

  return (
    <div className="calendar-picker">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="nav-btn"><ChevronLeft size={20} /></button>
        <h3>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</h3>
        <button onClick={handleNextMonth} className="nav-btn"><ChevronRight size={20} /></button>
      </div>
      <div className="calendar-weekdays">
        <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
      </div>
      <div className="calendar-grid">
        {days}
      </div>
    </div>
  );
};

export default CalendarPicker;
