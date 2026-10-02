/* Pattern 10 — 動詞變化表（診斷用：判斷「這個字是哪個動詞的哪種形態」） */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});

  // 不規則動詞：原形 第三人稱 過去式 過去分詞 -ing
  const IRREGULAR = `
have has had had having
do does did done doing
go goes went gone going
come comes came come coming
get gets got got getting
make makes made made making
take takes took taken taking
see sees saw seen seeing
know knows knew known knowing
think thinks thought thought thinking
say says said said saying
tell tells told told telling
give gives gave given giving
find finds found found finding
buy buys bought bought buying
bring brings brought brought bringing
eat eats ate eaten eating
drink drinks drank drunk drinking
sleep sleeps slept slept sleeping
speak speaks spoke spoken speaking
write writes wrote written writing
read reads read read reading
run runs ran run running
sit sits sat sat sitting
stand stands stood stood standing
meet meets met met meeting
leave leaves left left leaving
feel feels felt felt feeling
keep keeps kept kept keeping
begin begins began begun beginning
swim swims swam swum swimming
fly flies flew flown flying
ride rides rode ridden riding
drive drives drove driven driving
choose chooses chose chosen choosing
forget forgets forgot forgotten forgetting
hear hears heard heard hearing
lose loses lost lost losing
pay pays paid paid paying
send sends sent sent sending
spend spends spent spent spending
build builds built built building
cut cuts cut cut cutting
put puts put put putting
let lets let let letting
set sets set set setting
hit hits hit hit hitting
shut shuts shut shut shutting
hurt hurts hurt hurt hurting
cost costs cost cost costing
win wins won won winning
fall falls fell fallen falling
grow grows grew grown growing
draw draws drew drawn drawing
wear wears wore worn wearing
break breaks broke broken breaking
catch catches caught caught catching
teach teaches taught taught teaching
understand understands understood understood understanding
wake wakes woke woken waking
sing sings sang sung singing
sell sells sold sold selling
lend lends lent lent lending
hold holds held held holding
steal steals stole stolen stealing
throw throws threw thrown throwing
shake shakes shook shaken shaking
hide hides hid hidden hiding
feed feeds fed fed feeding
fight fights fought fought fighting
lead leads led led leading
mean means meant meant meaning
rise rises rose risen rising
ring rings rang rung ringing
shine shines shone shone shining
tear tears tore torn tearing
blow blows blew blown blowing
bite bites bit bitten biting
dig digs dug dug digging
hang hangs hung hung hanging
lay lays laid laid laying
lie lies lay lain lying
learn learns learned learned learning
burn burns burned burned burning
dream dreams dreamed dreamed dreaming
spell spells spelled spelled spelling
smell smells smelled smelled smelling
`;

  // 規則動詞（只列原形，其餘自動變化）
  const REGULAR = `
work play live like love want need use try study stay call ask help start finish watch listen talk walk cook
clean visit travel move wait open close turn show happen enjoy remember decide practice plan check arrive
answer reply cry smile laugh wash shower exercise review explain follow invite join change borrow return
repeat hope wish miss rain snow order pass prepare push save shout stop test thank worry share cancel
collect compare complete continue create dance delay enter fix guess imagine improve include introduce lock
mind notice offer pack paint park prefer promise protect provide receive record relax remind rent repair
rest search serve shop sign smoke surprise taste touch train trust type update warn wonder bake boil brush
carry chat climb count cover cross drop empty fail fill fold hate hurry jump kill knock land lift mix pull
rush sail stick tie wipe add attend appear believe belong bother celebrate complain connect contact copy
deliver describe develop disagree discuss divide doubt dress earn express face gather greet handle hire
ignore judge light manage matter measure mention own pick point press pretend prove raise reach realize
reduce refuse regret rely remove request require respect roll rub separate solve sound suffer suggest
suppose support switch tend tire translate treat view vote weigh welcome whisper wrap lock bake kiss hug
jog skip chat shop step trip tap beg rob plan stop drop
`;
  const DOUBLING = new Set(['stop', 'plan', 'drop', 'shop', 'chat', 'hug', 'jog', 'skip', 'step', 'trip', 'tap', 'beg', 'rob', 'travel', 'cancel']);
  // 英式雙寫 → 這裡統一用美式（travel→traveled、cancel→canceled），normalize 會把英式拼法轉成美式
  const NO_DOUBLE_US = new Set(['travel', 'cancel']);

  const forms = {};            // lemma -> {base,s,past,pp,ing}
  const index = {};            // token -> [{lemma, form}]

  function add(token, lemma, form) {
    (index[token] = index[token] || []);
    if (!index[token].some((x) => x.lemma === lemma && x.form === form)) index[token].push({ lemma, form });
  }
  function register(lemma, o) {
    forms[lemma] = o;
    add(o.base, lemma, 'base');
    add(o.s, lemma, 's');
    add(o.past, lemma, 'past');
    add(o.pp, lemma, 'pp');
    add(o.ing, lemma, 'ing');
  }

  function regularForms(b) {
    let s, past, ing;
    if (/(s|x|z|ch|sh|o)$/.test(b)) s = b + 'es';
    else if (/[^aeiou]y$/.test(b)) s = b.slice(0, -1) + 'ies';
    else s = b + 's';

    if (/[^aeiou]y$/.test(b)) past = b.slice(0, -1) + 'ied';
    else if (/e$/.test(b)) past = b + 'd';
    else if (DOUBLING.has(b) && !NO_DOUBLE_US.has(b)) past = b + b[b.length - 1] + 'ed';
    else past = b + 'ed';

    if (/ie$/.test(b)) ing = b.slice(0, -2) + 'ying';
    else if (/[^e]e$/.test(b)) ing = b.slice(0, -1) + 'ing';
    else if (DOUBLING.has(b) && !NO_DOUBLE_US.has(b)) ing = b + b[b.length - 1] + 'ing';
    else ing = b + 'ing';
    return { base: b, s, past, pp: past, ing };
  }

  IRREGULAR.trim().split('\n').forEach((line) => {
    const [base, s, past, pp, ing] = line.trim().split(/\s+/);
    register(base, { base, s, past, pp, ing });
  });
  REGULAR.trim().split(/\s+/).forEach((b) => { if (!forms[b]) register(b, regularForms(b)); });

  // be 動詞（特殊）
  const BE = {
    am: 'present', is: 'present', are: 'present', was: 'past', were: 'past', be: 'base', been: 'pp', being: 'ing'
  };
  Object.keys(BE).forEach((t) => add(t, 'be', BE[t] === 'present' ? 's' : BE[t] === 'past' ? 'past' : BE[t]));

  const MODALS = new Set(['can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must']);
  const MODAL_PAST = { can: 'could', will: 'would', shall: 'should', may: 'might' };
  const BE_SET = new Set(Object.keys(BE));
  const AUX = new Set(['do', 'does', 'did', 'have', 'has', 'had', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must']);

  const V = {
    forms, index, MODALS, BE_SET, AUX,
    /* token 可能是哪個動詞的哪種形態（可能多種） */
    analyze(tok) { return index[tok] || []; },
    isVerb(tok) { return !!index[tok] || MODALS.has(tok); },
    has(tok, form) { return (index[tok] || []).some((x) => x.form === form); },
    isBase(tok) { return V.has(tok, 'base'); },
    isThirdS(tok) { return V.has(tok, 's'); },
    isPast(tok) { return V.has(tok, 'past'); },
    isPP(tok) { return V.has(tok, 'pp'); },
    isIng(tok) { return V.has(tok, 'ing'); },
    /* 只可能是「過去式」而不可能是原形／現在式（例如 went, took, had, did） */
    isPastOnly(tok) {
      const a = index[tok];
      if (!a || !a.length) return false;
      return a.every((x) => x.form === 'past' || x.form === 'pp');
    },
    /* 只可能是原形／現在式（例如 go, take, eat 不含 read/put/cut 這類同形） */
    isPresentOnly(tok) {
      const a = index[tok];
      if (!a || !a.length) return MODALS.has(tok) && !Object.values(MODAL_PAST).includes(tok);
      return a.every((x) => x.form === 'base' || x.form === 's');
    },
    lemmaOf(tok) { const a = index[tok]; return a && a.length ? a[0].lemma : null; },
    sameLemma(a, b) {
      const A = index[a], B = index[b];
      if (!A || !B) return false;
      return A.some((x) => B.some((y) => y.lemma === x.lemma));
    },
    /* 取某動詞（用 lemma）的某形態 */
    formOf(lemma, form) {
      if (lemma === 'be') return ({ base: 'be', s: 'is', past: 'was', pp: 'been', ing: 'being' })[form];
      return forms[lemma] ? forms[lemma][form] : null;
    },
    /* wish 之後該用的「過去式」：have→had, am/is→were, can→could … */
    pastOf(tok) {
      if (tok === 'am' || tok === 'is' || tok === 'are' || tok === 'be') return 'were';
      if (MODAL_PAST[tok]) return MODAL_PAST[tok];
      const a = index[tok];
      if (a && a.length) {
        const f = forms[a[0].lemma];
        if (f) return f.past;
      }
      return null;
    },
    /* 簡易判斷：是不是形容詞式的 -ed（tired / bored …），用來避開「he's tired」被當成 has */
    lemmaFormsText(lemma) { return forms[lemma] ? Object.values(forms[lemma]).join('/') : ''; }
  };

  P10.verbs = V;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
