import { scenarios } from './scenarios';

const holdoutCases = new Set(['004', '011', '016', '019', '023', '026', '028', '033', '036', '042', '044', '049']);

export const splits = {
  smoke: ['PM-017@008', 'PM-040@009', 'PM-008@038', 'PM-027@001', 'PM-034@002', 'PM-046@041'],
  holdout: scenarios.filter((scenario) => holdoutCases.has(scenario.case)).map((scenario) => scenario.id),
};
