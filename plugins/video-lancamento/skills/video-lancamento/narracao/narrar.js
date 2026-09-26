// Narração: gera cada fala por TTS e mede o tempo de cada palavra.
//
//   node narrar.js --vozes                 lista vozes em português da biblioteca da ElevenLabs (e as da sua conta)
//   node narrar.js --amostras id1,id2,id3  gera a primeira fala com cada voz em narracao/amostras/
//   node narrar.js --usar <voice_id>       escolhe a voz (adiciona à conta se vier da biblioteca)
//   node narrar.js                         gera as falas que mudaram (cache por texto falado + voz + modelo)
//   node narrar.js --tudo                  refaz todas
//   node narrar.js --openai                usa a OpenAI em vez da ElevenLabs
//
// Chaves só por variável de ambiente, nunca em arquivo do projeto: ELEVENLABS_API_KEY ou OPENAI_API_KEY.
// Texto das falas em falas.js. Saída: narracao/<id>.wav e narracao.js (texto da legenda, duração e tempo de cada
// palavra, relativos ao início da fala). Onde cada fala entra no vídeo fica em tempos.js; a mixagem, em trilha.js.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const FALAS = require('./falas.js');
const DIR = path.join(__dirname, 'narracao');
const ARQ_VOZ = path.join(DIR, 'voz-eleven.json');
fs.mkdirSync(DIR, { recursive: true });
const args = process.argv.slice(2);
const OPENAI = args.includes('--openai');

// ------------------------------------------------------------------ ElevenLabs
const MODELO = process.env.MODELO_ELEVEN || 'eleven_multilingual_v2';
const AJUSTES = { stability: 0.42, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 1.0 };
function chaveEleven() {
  const k = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!k) throw new Error('Falta a variável ELEVENLABS_API_KEY (ou use --openai com OPENAI_API_KEY).');
  return k;
}
async function eleven(caminho, opcoes = {}) {
  const r = await fetch('https://api.elevenlabs.io' + caminho, { ...opcoes, headers: { 'xi-api-key': chaveEleven(), 'content-type': 'application/json', ...(opcoes.headers || {}) } });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status} em ${caminho.split('?')[0]}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const vozAtual = () => process.env.VOZ_ELEVEN || (fs.existsSync(ARQ_VOZ) ? JSON.parse(fs.readFileSync(ARQ_VOZ, 'utf8')).voice_id : null);

// fala com tempo por caractere; devolve as palavras com início e fim
async function ttsEleven(fala, voz, arquivo, antes = '', depois = '') {
  const j = await eleven(`/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    body: JSON.stringify({ text: fala, model_id: MODELO, voice_settings: AJUSTES, previous_text: antes || undefined, next_text: depois || undefined }),
  });
  const mp3 = arquivo.replace(/\.wav$/, '.mp3');
  fs.writeFileSync(mp3, Buffer.from(j.audio_base64, 'base64'));
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', arquivo]);
  const al = j.alignment || j.normalized_alignment;
  const words = [];
  let atual = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (atual) { words.push(atual); atual = null; } return; }
    if (!atual) atual = { word: '', start: al.character_start_times_seconds[i] };
    atual.word += ch; atual.end = al.character_end_times_seconds[i];
  });
  if (atual) words.push(atual);
  return { text: fala, words };
}

async function listarVozes() {
  const minhas = await eleven('/v1/voices');
  console.log('Na sua conta:');
  minhas.voices.forEach((v) => console.log(`  ${v.voice_id}  ${v.name}  (${v.category})  ${Object.values(v.labels || {}).join(', ')}`));
  const q = new URLSearchParams({ page_size: '40', language: 'pt', sort: 'usage_character_count_1y' });
  const lib = await eleven('/v1/shared-voices?' + q);
  console.log('\nBiblioteca, português (mais usadas primeiro):');
  lib.voices.forEach((v) => console.log(`  ${v.voice_id}  ${v.name} | ${v.gender || ''} ${v.age || ''} ${v.accent || ''} ${v.locale || ''} | ${v.use_case || ''} | ${(v.description || '').replace(/\s+/g, ' ').slice(0, 90)} | dono ${v.public_owner_id}`));
  fs.writeFileSync(path.join(DIR, 'vozes-biblioteca.json'), JSON.stringify(lib.voices, null, 1));
}

// garante que a voz está na conta (vozes da biblioteca precisam ser adicionadas antes de gerar)
async function garantirVoz(voiceId) {
  const minhas = await eleven('/v1/voices');
  const ja = minhas.voices.find((v) => v.voice_id === voiceId);
  if (ja) return { voice_id: ja.voice_id, nome: ja.name };
  const libArq = path.join(DIR, 'vozes-biblioteca.json');
  const lib = fs.existsSync(libArq) ? JSON.parse(fs.readFileSync(libArq, 'utf8')) : [];
  const v = lib.find((x) => x.voice_id === voiceId);
  if (!v) throw new Error('Voz não está na conta nem na última listagem da biblioteca; rode --vozes antes.');
  const r = await eleven(`/v1/voices/add/${v.public_owner_id}/${v.voice_id}`, { method: 'POST', body: JSON.stringify({ new_name: v.name }) });
  return { voice_id: r.voice_id, nome: v.name };
}

// ------------------------------------------------------------------ OpenAI (alternativa)
const VOZ_OPENAI = process.env.VOZ || 'cedar';
const INSTRUCOES = process.env.INSTRUCOES_VOZ || 'Português do Brasil, sotaque neutro. Locutor de lançamento de produto: confiante e caloroso, sem tom de vendedor. Ritmo ágil.';
function chaveOpenAI() {
  const k = (process.env.OPENAI_API_KEY || '').trim();
  if (!k) throw new Error('Falta a variável OPENAI_API_KEY.');
  return k;
}
async function ttsOpenAI(fala, arquivo) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + chaveOpenAI(), 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: VOZ_OPENAI, input: fala, instructions: INSTRUCOES, response_format: 'wav' }),
  });
  if (!r.ok) throw new Error('OpenAI TTS ' + r.status + ' ' + (await r.text()).slice(0, 200));
  fs.writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(arquivo)], { type: 'audio/wav' }), path.basename(arquivo));
  fd.append('model', 'whisper-1'); fd.append('language', 'pt'); fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'word');
  const t = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + chaveOpenAI() }, body: fd });
  if (!t.ok) throw new Error('OpenAI transcrição ' + t.status);
  const j = await t.json();
  return { text: j.text, words: j.words || [] };
}

// ------------------------------------------------------------------ comum
const duracao = (arquivo) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]).toString());
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
function alinhar(texto, words, dur) {
  const tokens = texto.split(' ');
  const ws = words.filter((w) => norm(w.word));
  if (ws.length === tokens.length) return tokens.map((p, i) => ({ p, a: +ws[i].start.toFixed(3), b: +ws[i].end.toFixed(3) }));
  const a0 = ws.length ? ws[0].start : 0.05, b1 = ws.length ? ws[ws.length - 1].end : dur - 0.05;
  const pesos = tokens.map((t) => Math.max(2, norm(t).length)), soma = pesos.reduce((x, y) => x + y, 0);
  let acc = a0;
  console.warn(`  aviso: ${ws.length} palavras com tempo para ${tokens.length} escritas; tempos distribuídos`);
  return tokens.map((p, i) => { const d = ((b1 - a0) * pesos[i]) / soma; const r = { p, a: +acc.toFixed(3), b: +(acc + d).toFixed(3) }; acc += d; return r; });
}

(async () => {
  if (args[0] === '--vozes') return listarVozes();
  if (args[0] === '--usar') {
    const v = await garantirVoz(args[1]);
    fs.writeFileSync(ARQ_VOZ, JSON.stringify(v, null, 1));
    return console.log(`Voz escolhida: ${v.nome} (${v.voice_id})`);
  }
  if (args[0] === '--amostras') {
    const dir = path.join(DIR, 'amostras'); fs.mkdirSync(dir, { recursive: true });
    for (const id of args[1].split(',')) {
      const v = await garantirVoz(id);
      const arq = path.join(dir, `${v.nome.replace(/[^\w-]+/g, '_')}.wav`);
      await ttsEleven(FALAS[0].fala, v.voice_id, arq);
      console.log(arq);
    }
    return;
  }
  const voz = OPENAI ? 'openai:' + VOZ_OPENAI : vozAtual();
  if (!voz) throw new Error('Nenhuma voz escolhida: rode --vozes e depois --usar <voice_id> (ou use --openai).');
  const tudo = args.includes('--tudo');
  const saida = [];
  for (const [i, f] of FALAS.entries()) {
    const wav = path.join(DIR, f.id + '.wav'), meta = path.join(DIR, f.id + '.json');
    const assinatura = crypto.createHash('sha1').update(JSON.stringify([f.fala, voz, OPENAI ? INSTRUCOES : [MODELO, AJUSTES]])).digest('hex');
    let m = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : null;
    if (tudo || !m || m.assinatura !== assinatura || !fs.existsSync(wav)) {
      process.stdout.write(`${f.id}: gerando voz... `);
      const r = OPENAI ? await ttsOpenAI(f.fala, wav) : await ttsEleven(f.fala, voz, wav, FALAS[i - 1]?.fala, FALAS[i + 1]?.fala);
      m = { assinatura, ouvido: r.text, words: r.words };
      fs.writeFileSync(meta, JSON.stringify(m, null, 1));
      console.log('ok');
    }
    const dur = duracao(wav);
    saida.push({ id: f.id, texto: f.texto, dur: +dur.toFixed(3), palavras: alinhar(f.texto, m.words, dur) });
    console.log(`${f.id} ${dur.toFixed(2)}s | legenda: ${f.texto} | falado: ${f.fala}`);
  }
  const js = `// Gerado por narrar.js. Tempos em segundos, relativos ao início de cada fala.\n(function (root) {\n  const N = ${JSON.stringify(Object.fromEntries(saida.map((s) => [s.id, s])), null, 1)};\n  if (typeof module !== 'undefined' && module.exports) module.exports = N; else root.NARRACAO = N;\n})(this);\n`;
  fs.writeFileSync(path.join(__dirname, 'narracao.js'), js);
})().catch((e) => { console.error(e.message); process.exit(1); });
