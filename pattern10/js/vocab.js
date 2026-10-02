/* Pattern 10 — 受控字彙（Allowed Vocabulary，Starter Pack）
 * 規格 §33：AI 產生的變形題，90% 的字必須在這份名單裡，每題最多一個新字。
 * 只列「原形」；判斷時會自動處理 -s / -ed / -ing / -ly / -er / 縮寫。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const V = P10.verbs, E = P10.engine;

  /* 第 2 章（日常開口說）新增的字，接在最後一行 */
  const WORDS = `
a an the this that these those my your his her its our their me him us them i you he she it we they myself yourself himself herself itself ourselves themselves
what who which where when why how whose whom some any no not all each every both few many much more most other another such own same only just also very too so than then there here now ever never always usually often sometimes already still yet again once twice
and but or if because while although though whether as before after until since during about above across against along among around at behind below beside between beyond by down for from in inside into near of off on onto out outside over through to toward under up upon with within without
be am is are was were been being have has had do does did can could will would shall should may might must let get got go going gone
add answer arrive ask bake begin believe bring build buy call carry catch change check choose clean climb close come cook cost count cross cry cut dance decide die draw dream dress drink drive drop eat end enjoy enter exercise explain fall feel fight fill find finish fix fly follow forget forgive give grow guess hang happen hate hear help hide hit hold hope hurry hurt imagine invite join jump keep kick kill kiss knock know laugh learn leave lend lie like listen live look lose love make mean meet mind miss move need notice offer open order pay pick plan play practice prefer prepare press promise pull push put rain reach read remember repeat reply rest return ride ring rise run rush save say see seem sell send set share shine shop shout show shut sing sit sleep smell smile smoke snow speak spend stand start stay steal stop study succeed swim take talk taste teach tell test thank think throw touch travel try turn type understand use visit wait wake walk want wash watch wear win wish work worry write
air animal apple area arm baby back bag ball bank bath beach bed bike bird birthday bit blood boat body book boss bottle box boy bread breakfast brother bus business butter cake camera car card case cat chair chance child children city class clock clothes coat coffee color computer concert corner country course cousin cup customer dad date day desk dessert dinner dish doctor dog dollar door driver ear egg evening exam example eye face fact family farm father fear field film finger fire fish floor flower food foot friend fruit fun future game garden gift girl glass gold group guy hair half hand head health heart history holiday home horse hospital hotel hour house idea information job joke key kid kind king kitchen knee lady lake language letter library life light line lip list lunch machine man map market matter meat meeting message middle milk minute mirror mom money month moon morning mother mountain mouth movie music name neck news newspaper night noise nose number office oil paper parent park part party passport people person phone photo piano picture piece place plant plate player pocket police problem project question radio reason report restaurant rice river road room rule salad salt school sea season seat secret shirt shoe shower side sign singer sister size skin sky smile soap sock song sound soup space speed sport spring stair star station stomach stone store story street student subject sugar summer sun supper table tea teacher team thing time tip today tomorrow tonight tooth top town toy traffic train tree trip trouble truth umbrella uncle village voice wall water way weather wedding week weekend weight wife wind window winter woman wood word world year yesterday zoo
afternoon morning noon midnight sunday monday tuesday wednesday thursday friday saturday january february march april may june july august september october november december
able afraid alone angry bad beautiful best better big bigger black blue boring brave brown busy careful cheap clear cold common cool correct crowded cute dark dead dear difficult dirty early easy empty enough excited expensive famous fast favorite fine first free fresh full funny glad good great green happy hard healthy heavy high hot hungry important interesting large last late left lazy little local lonely long loud low lucky mad main new next nice noisy old popular pretty proud quick quiet ready real red rich right round sad safe scared sick short shy simple sleepy slow small soft sorry special spicy strong sure sweet tall tasty terrible tired true ugly unhealthy useful warm weak well wet white whole wide wise wrong yellow young
one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand second third zero
english japan taipei kaohsiung taiwan chinese
ok yes please sorry thanks hello hi
rather forward used never wish took reason whether
tv lot plane vegetable rarely far front bookstore price compare moment result decision noodle cash credit elevator battery rent asleep kilogram kilo lock cancel attend oversleep overslept
away back together anymore either else instead enough early ago alone almost really quite maybe perhaps probably
email okay everyone everybody someone somebody anyone nobody nothing something anything everything somewhere anywhere nowhere
pass pen document airport upstairs menu bowl receipt juice package ticket homework
hike camp marry married wedding daughter son wife husband invitation care interrupt break taxi cab grandma grandmother grandfather grandpa
supermarket restroom nearby cinema pool company hotel hospital window station table fruit swim swimming
`;
  const SET = new Set(WORDS.trim().split(/\s+/));

  function candidates(t) {
    const out = [t];
    if (t.endsWith("'s")) out.push(t.slice(0, -2));
    if (t.endsWith('ies')) out.push(t.slice(0, -3) + 'y');
    if (t.endsWith('es')) out.push(t.slice(0, -2));
    if (t.endsWith('s')) out.push(t.slice(0, -1));
    if (t.endsWith('ied')) out.push(t.slice(0, -3) + 'y');
    if (t.endsWith('ed')) { out.push(t.slice(0, -2)); out.push(t.slice(0, -1)); if (/(.)\1ed$/.test(t)) out.push(t.slice(0, -3)); }
    if (t.endsWith('ing')) { out.push(t.slice(0, -3)); out.push(t.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(t)) out.push(t.slice(0, -4)); }
    if (t.endsWith('ly')) out.push(t.slice(0, -2));
    if (t.endsWith('er')) { out.push(t.slice(0, -2)); out.push(t.slice(0, -1)); }
    if (t.endsWith('est')) { out.push(t.slice(0, -3)); out.push(t.slice(0, -2)); }
    if (t.endsWith('ier')) out.push(t.slice(0, -3) + 'y');
    return out;
  }

  const VOC = {
    WORDS, SET,
    isAllowed(tok) {
      if (!tok || /^\d+$/.test(tok)) return true;
      if (SET.has(tok)) return true;
      const lem = V.lemmaOf(tok);
      if (lem && SET.has(lem)) return true;
      return candidates(tok).some((c) => SET.has(c));
    },
    /* 分析一句話：回傳 {tokens, unknown, ratio(已知字比例)} */
    check(text) {
      const tokens = E.tokenize(text);
      const unknown = [...new Set(tokens.filter((t) => !VOC.isAllowed(t)))];
      const n = tokens.filter((t) => !/^\d+$/.test(t)).length || 1;
      const unknownCount = tokens.filter((t) => !VOC.isAllowed(t)).length;
      return { tokens, unknown, ratio: 1 - unknownCount / n };
    }
  };

  P10.vocab = VOC;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
