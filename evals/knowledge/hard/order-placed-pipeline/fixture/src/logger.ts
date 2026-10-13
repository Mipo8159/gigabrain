type Fields = Record<string, unknown>;

function line(level: string, msg: string, fields?: Fields) {
  const out = JSON.stringify({ level, msg, t: new Date().toISOString(), ...fields });
  (level === 'error' ? process.stderr : process.stdout).write(out + '\n');
}

export const log = {
  info: (msg: string, f?: Fields) => line('info', msg, f),
  warn: (msg: string, f?: Fields) => line('warn', msg, f),
  error: (msg: string, f?: Fields) => line('error', msg, f),
};
