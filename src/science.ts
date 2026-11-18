// ------------------------------------------------------------------
// The reasoning behind the plan, shown on "Why this works".
// Every reference is a real, published paper (or a preprint, marked).
// ------------------------------------------------------------------

// pmids: PubMed IDs for the studies behind one entry, shown as links on it.
export const SCIENCE: { title: string; body: string; strength: 'Strong' | 'Moderate' | 'Emerging'; pmids?: string[] }[] = [
  {
    title: 'Weekly sets per muscle',
    strength: 'Strong',
    body:
      'More weekly hard sets build more muscle, but each extra set adds less than the one before. Around 10+ sets a week per muscle is a good working range for trained lifters, and gains keep coming past 20 with less from each set. Every muscle with direct work starts its block at 10 or more, including arms. The app ramps each muscle from the low end of its range to the peak over 4 weeks instead of starting at the top.',
  },
  {
    title: 'Holding muscle in a cut',
    strength: 'Moderate',
    body:
      'Muscle and strength can be kept on roughly a third of normal training volume, as long as the weights stay heavy. A calorie deficit also blunts muscle gain, so extra sets buy less. That is why Cut mode uses lower targets and keeps you lifting heavy.',
  },
  {
    title: 'Counting helper muscles as half',
    strength: 'Moderate',
    body:
      'A press works triceps too, but less than a pushdown. Counting each set as half for helper muscles predicts growth better than counting it as zero or as a full set. It is still an estimate, so every muscle also gets at least 3 direct sets in each workout that trains it.',
  },
  {
    title: 'How often to train a muscle',
    strength: 'Moderate',
    body:
      'Training a muscle about twice a week works at least as well as once. Beyond that, total weekly sets matter more than how they are split up. The app works out how often each muscle comes up from your program and the days a week you plan to lift.',
  },
  {
    title: 'Choosing a split',
    strength: 'Moderate',
    body:
      'When weekly sets are the same, full body, upper / lower, push / pull / legs and body-part splits all build similar muscle. One study in trained men found a small edge for full body 3 times a week over a once-a-week split. So the best split is the one that fits the days you can actually lift: full body for 2 to 3 days, upper / lower for 4, and the longer splits for 5 or 6.',
  },
  {
    title: 'Strength, size or endurance',
    strength: 'Strong',
    body:
      'Heavy sets of about 1 to 6 reps build the most strength. Muscle grows about the same across roughly 5 to 30 reps when sets are hard. Sets of 15 or more with short rest build local endurance best. The goal you pick for a block sets the reps, rest and how close to failure you go.',
  },
  {
    title: 'Fewer sets for strength',
    strength: 'Moderate',
    body:
      'Strength keeps improving with more sets, but it levels off sooner than size does, and even a few heavy sets a week make trained lifters stronger. So a strength block aims for about 30% fewer weekly sets than a hypertrophy block, and heavy sets stay 2 to 3 reps short of failure, since going all the way adds little strength.',
  },
  {
    title: 'Fewer days a week',
    strength: 'Moderate',
    body:
      'Muscle still grows on fewer than 5 sets per muscle a week, just less than on more. With 2 to 4 days the app aims for fewer weekly sets (about half at 2 days) so each session stays a sensible length. If you plan more days than you get to, catch-up sets make up some of the difference.',
  },
  {
    title: 'Short rest for endurance',
    strength: 'Moderate',
    body:
      'Long rest helps strength and size. For local endurance, short rest of about a minute is the point: training while partly tired is what builds the ability to keep going. An endurance block uses about 60 seconds between sets.',
  },
  {
    title: 'Catch-up and the per-session limit',
    strength: 'Emerging',
    body:
      'Piling all of a missed week into one workout is not as useful as it looks: past roughly 6 to 11 sets for one muscle in one session, extra sets seem to do little. That is the least settled finding here. So catch-up adds at most 3 sets per muscle per session (10 total at most) and spreads the rest over the next sessions.',
  },
  {
    title: 'How close to failure',
    strength: 'Moderate',
    body:
      'Sets need to be hard, but going all the way to failure adds little muscle and costs more fatigue. The app starts each block 2 to 3 reps short of failure on big lifts and moves closer as the block goes on. Isolation work can go closer.',
  },
  {
    title: 'Rep ranges',
    strength: 'Strong',
    body:
      'Muscle grows across a wide range of reps (about 5 to 30) as long as sets are close to failure. The app uses 6 to 12 for presses, rows and squats, and higher reps for isolation work, which is easier on joints.',
  },
  {
    title: 'Rest between sets',
    strength: 'Moderate',
    body:
      'Resting 2 minutes or more on big lifts lets you keep your reps up, which adds up to more growth than short rest. For isolation work, rest beyond about 90 seconds adds little. The timer suggests 3 minutes for heavy compounds, 2:30 for other compounds and 1:30 for isolation, adding 30 seconds after a set to failure and a minute on a lift that has stalled.',
  },
  {
    title: 'Progression',
    strength: 'Strong',
    body:
      'Double progression: keep the weight until every set hits the top of the rep range, then add weight and start at the bottom. In a cut, holding your weights is a win. The app flags a stall only after 3 sessions without progress.',
  },
  {
    title: 'Estimating your 1 rep max',
    strength: 'Moderate',
    body:
      'A set of a few reps close to failure predicts your 1 rep max well, usually within a few percent up to about 10 reps, so there is no need to test a true max. The app averages two common formulas (Epley and Brzycki). When a new block changes your rep range, it uses this estimate to pick a starting weight for the new reps with 2 left in the tank.',
  },
  {
    title: 'Deloads',
    strength: 'Emerging',
    body:
      'A scheduled deload week did not add muscle in a controlled trial, and coaches now favour deloading when needed rather than on a timer, most often every 4 to 6 weeks. So the app never forces one. It suggests one from week 5 of a block if 3 or more lifts have stalled, or once a block reaches week 7, and you decide. In a cut it only suggests one for a long block, since stalls there are expected.',
    pmids: ['38274324', '37730925'],
  },
  {
    title: 'Rate of weight loss',
    strength: 'Moderate',
    body:
      'Losing about 0.5 to 1% of body weight a week keeps more muscle than losing faster. The Body tab tracks your 7-day average from Apple Health. Above 1% a week, the app tells you to eat more and pauses catch-up sets.',
  },
  {
    title: 'Stalls early in a block',
    strength: 'Moderate',
    body:
      'A lift that holds the same weight and reps for 3 sessions has stalled. When 3 or more stall in the first 4 weeks of a block, or at any point in a cut, that is usually short-term fatigue or the calorie deficit, not a need for a lighter week. The app shows a recovery note instead: an extra minute of rest on those lifts (longer rest keeps reps up, which builds more strength and muscle), 7 or more hours of sleep (short sleep lowers strength and muscle building), and enough protein. In a cut, eating less slows gains in muscle more than strength, and holding your weights is the goal. Each lift counts once a week.',
    pmids: ['26605807', '29422383', '34623696'],
  },
  {
    title: 'Short sleep, no extra sets',
    strength: 'Emerging',
    body:
      'One short night barely affects lifting. Several in a row lower performance and muscle building, though the studies are small. Your normal workout still helps, so after 3 nights under 6 hours you train as usual, just without catch-up sets.',
    pmids: ['35708888', '8112265', '36136596', '33400856', '32078168'],
  },
  {
    title: 'Protein',
    strength: 'Strong',
    body: 'About 1.6 g per kg a day covers most of the benefit, and more is fine. The Body tab works out your number from your weight in Apple Health. It matters most in a cut, when hunger makes it easy to fall short.',
  },
];

// A PubMed search for a reference's title, so each one opens to the paper.
export function pubmedSearch(reference: string) {
  const title = reference.split('. ')[1] ?? reference;
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(title)}`;
}

// What each linked study is, checked on PubMed
export const PMID_LABELS: Record<string, string> = {
  '35708888': 'Craven 2022: sleep loss and physical performance (meta-analysis)',
  '8112265': 'Reilly 1994: partial sleep loss and weightlifting',
  '36136596': 'Knowles 2022: sleep restriction and resistance training in women',
  '33400856': 'Lamon 2021: one night without sleep and muscle protein building',
  '32078168': 'Saner 2020: sleep restriction and muscle protein building',
  '38274324': 'Coleman 2024: a one-week deload and muscle gains',
  '37730925': 'Bell 2023: coaches\' consensus on deloading',
  '26605807': 'Schoenfeld 2016: longer rest, more strength and muscle',
  '29422383': 'Knowles 2018: poor sleep and muscle strength (review)',
  '34623696': 'Murphy & Koehler 2022: a calorie deficit and training gains (meta-analysis)',
};

export function pubmedLink(pmid: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

export const REFERENCES = [
  'Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci. 2017;35(11):1073-1082.',
  'Pelland JC, Remmert JF, Robinson ZP, et al. The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gain. SportRxiv preprint, 2024.',
  'Bickel CS, Cross JM, Bamman MM. Exercise dosing to retain resistance training adaptations in young and older adults. Med Sci Sports Exerc. 2011;43(7):1177-1187.',
  'Spiering BA, Mujika I, Sharp MA, Foulis SA. Maintaining physical performance: the minimal dose of exercise needed to preserve endurance and strength over time. J Strength Cond Res. 2021;35(5):1449-1458.',
  'Murphy C, Koehler K. Energy deficiency impairs resistance training gains in lean mass but not strength: a meta-analysis and meta-regression. Scand J Med Sci Sports. 2022;32(1):125-137.',
  'Schoenfeld BJ, Ogborn D, Krieger JW. Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis. Sports Med. 2016;46(11):1689-1697.',
  'Schoenfeld BJ, Grgic J, Krieger J. How many times per week should a muscle be trained to maximize muscle hypertrophy? J Sports Sci. 2019;37(11):1286-1295.',
  'Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ. Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis. Sports Med. 2023;53(3):649-665.',
  'Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL. Loading recommendations for muscle strength, hypertrophy, and local endurance: a re-examination of the repetition continuum. Sports. 2021;9(2):32.',
  'Bell L, Strafford BW, Coleman M, Androulakis Korakakis P, Nolan D. Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach. Sports Med Open. 2023;9(1):87.',
  'Coleman M, Burke R, Augustin F, et al. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. PeerJ. 2024;12:e16777.',
  'Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr. 2014;11:20.',
  'Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J. Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes. Int J Sport Nutr Exerc Metab. 2011;21(2):97-104.',
  'Knowles OE, Drinkwater EJ, Urwin CS, Lamon S, Aisbett B. Inadequate sleep and muscle strength: implications for resistance training. J Sci Med Sport. 2018;21(9):959-968.',
  'Schoenfeld BJ, Pope ZK, Benik FM, et al. Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. J Strength Cond Res. 2016;30(7):1805-1812.',
  'Grgic J, Lazinica B, Mikulic P, Krieger JW, Schoenfeld BJ. The effects of short versus long inter-set rest intervals in resistance training on measures of muscle hypertrophy: a systematic review. Eur J Sport Sci. 2017;17(8):983-993.',
  'Schoenfeld BJ, Ratamess NA, Peterson MD, Contreras B, Tiryaki-Sonmez G. Influence of resistance training frequency on muscular adaptations in well-trained men. J Strength Cond Res. 2015;29(7):1821-1829.',
  'Grgic J, Schoenfeld BJ, Davies TB, Lazinica B, Krieger JW, Pedisic Z. Effect of resistance training frequency on gains in muscular strength: a systematic review and meta-analysis. Sports Med. 2018;48(5):1207-1220.',
  'Ralston GW, Kilgore L, Wyatt FB, Baker JS. The effect of weekly set volume on strength gain: a meta-analysis. Sports Med. 2017;47(12):2585-2601.',
  'Androulakis-Korakakis P, Fisher JP, Steele J. The minimum effective training dose required to increase 1RM strength in resistance-trained men: a systematic review and meta-analysis. Sports Med. 2020;50(4):751-765.',
  'Grgic J, Schoenfeld BJ, Orazem J, Sabol F. Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: a systematic review and meta-analysis. J Sport Health Sci. 2022;11(2):202-211.',
  'Campos GER, Luecke TJ, Wendeln HK, et al. Muscular adaptations in response to three different resistance-training regimens: specificity of repetition maximum training zones. Eur J Appl Physiol. 2002;88(1-2):50-60.',
  'de Salles BF, Simão R, Miranda F, et al. Rest interval between sets in strength training. Sports Med. 2009;39(9):765-777.',
  'LeSuer DA, McCormick JH, Mayhew JL, Wasserstein RL, Arnold MD. The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift. J Strength Cond Res. 1997;11(4):211-213.',
  'Morton RW, Murphy KT, McKellar SR, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength. Br J Sports Med. 2018;52(6):376-384.',
];
