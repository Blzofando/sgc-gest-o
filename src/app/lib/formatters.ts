export const formatMoney = (value: number | string) => {
  const num = parseFloat(value.toString());
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const formatCNPJ = (value: string) => {
  if (!value) return "";
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

export const formatPhone = (value: string) => {
  if (!value) return "";
  const v = value.replace(/\D/g, "");
  if (v.length === 11) return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (v.length === 10) return v.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value;
};