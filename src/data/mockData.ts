import { Participant, AttendanceRecord, Group, AttendanceSession } from '../types';

export const GROUPS: Group[] = [
  {
    id: 'mobilization',
    name: 'Mobilização e Temas Transversais',
    color: '#dc2626',
    description: 'Conversas sobre mulheres, saúde, crianças, adolescentes, idosos, esporte, cultura e comunicação',
    icon: 'MessageCircle'
  },
  {
    id: 'family-budget',
    name: 'Orçamento da Família',
    color: '#ca8a04',
    description: 'Dicas para organizar as contas de casa e os gastos do condomínio',
    icon: 'PiggyBank'
  },
  {
    id: 'environment',
    name: 'Meio Ambiente',
    color: '#16a34a',
    description: 'Vamos falar de reciclagem, plantio, horta comunitária e cuidados com a natureza',
    icon: 'Leaf'
  },
  {
    id: 'work-income',
    name: 'Trabalho e Renda',
    color: '#2563eb',
    description: 'Cursos, capacitações e formas de gerar renda com apoio do movimento',
    icon: 'Briefcase'
  },
  {
    id: 'construction-monitoring',
    name: 'Acompanhamento da Obra e Pós-obra',
    color: '#7c3aed',
    description: 'Entenda como está a obra, quais são seus direitos e como será o dia a dia depois da mudança',
    icon: 'HardHat'
  }
];

