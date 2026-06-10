import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import type { Bot } from '@/lib/types';

export function BotPicker({
  value,
  onChange,
  label = 'Agente',
}: {
  value?: string;
  onChange: (botId: string) => void;
  label?: string;
}) {
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const bots = botsQuery.data ?? [];

  return (
    <div>
      <label className="field-label">{label}</label>
      <Select value={value ?? ''} onChange={(event) => onChange(event.target.value)} disabled={!bots.length}>
        <option value="">Selecciona agente</option>
        {bots.map((bot: Bot) => (
          <option key={bot.id} value={bot.id}>
            {bot.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
