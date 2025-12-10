export const formatDateTimeBR = (value: string | number | Date) => {
  const d = new Date(value);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
};

export const formatDateBR = (value: string | number | Date) => {
  const d = new Date(value);
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatTimeBR = (value: string | number | Date) => {
  const d = new Date(value);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};