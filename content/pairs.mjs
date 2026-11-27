// Kuraterte par for «How are X and Y related?»-sider. Lag på nytt: node tools/resolve-pairs.mjs > content/pairs.mjs
export const PAIRS = [
  ['Q9439', 'Q43274'], // Queen Victoria – Charles III
  ['Q9439', 'Q40787'], // Queen Victoria – Nicholas II of Russia
  ['Q9439', 'Q2677'], // Queen Victoria – Wilhelm II
  ['Q269412', 'Q40787'], // George V – Nicholas II of Russia
  ['Q269412', 'Q2677'], // George V – Wilhelm II
  ['Q9682', 'Q80976'], // Elizabeth II – Prince Philip, Duke of Edinburgh
  ['Q43274', 'Q165241'], // Charles III – Haakon VIII of Norway
  ['Q43274', 'Q1004037'], // Charles III – Frederik X
  ['Q43274', 'Q45068'], // Charles III – Carl XVI Gustaf
  ['Q9682', 'Q57287'], // Elizabeth II – Harald V
  ['Q151305', 'Q43274'], // Christian IX of Denmark – Charles III
  ['Q9439', 'Q9682'], // Queen Victoria – Elizabeth II
  ['Q9439', 'Q36812'], // Queen Victoria – William, Prince of Wales
  ['Q152094', 'Q9439'], // Alexandra Feodorovna (Alix of Hesse) – Queen Victoria
  ['Q154927', 'Q269412'], // Haakon VII – George V
  ['Q38370', 'Q7207'], // Henry VIII – Elizabeth I
  ['Q675493', 'Q7207'], // Henry VII of England – Elizabeth I
  ['Q131412', 'Q7207'], // Mary, Queen of Scots – Elizabeth I
  ['Q38370', 'Q79972'], // Henry VIII – James VI and I
  ['Q162356', 'Q38370'], // Lady Jane Grey – Henry VIII
  ['Q129247', 'Q133028'], // Edward III of England – Richard III of England
  ['Q102140', 'Q42305'], // Henry II of England – Richard I of England
  ['Q160341', 'Q675493'], // Edward IV – Henry VII of England
  ['Q193752', 'Q38370'], // John of Gaunt – Henry VIII
  ['Q178525', 'Q129308'], // Eleanor of Aquitaine – John, King of England
  ['Q81506', 'Q122553'], // Charles I of England – Charles II of England
  ['Q126188', 'Q119702'], // James II of England – Anne, Queen of Great Britain
  ['Q312581', 'Q126188'], // Charles Edward Stuart – James II of England
  ['Q131706', 'Q47365'], // Maria Theresa – Marie Antoinette
  ['Q32500', 'Q34417'], // Charles V, Holy Roman Emperor – Philip II of Spain
  ['Q51056', 'Q43063'], // Franz Joseph I of Austria – Archduke Franz Ferdinand of Austria
  ['Q36174', 'Q34417'], // Charles II of Spain – Philip II of Spain
  ['Q150726', 'Q32500'], // Maximilian I, Holy Roman Emperor – Charles V, Holy Roman Emperor
  ['Q7742', 'Q7732'], // Louis XIV – Louis XVI
  ['Q936976', 'Q7742'], // Henry IV of France – Louis XIV
  ['Q7742', 'Q170467'], // Louis XIV – Philip V of Spain
  ['Q47365', 'Q7732'], // Marie Antoinette – Louis XVI
  ['Q8479', 'Q40787'], // Peter the Great – Nicholas II of Russia
  ['Q36450', 'Q40787'], // Catherine the Great – Nicholas II of Russia
  ['Q8479', 'Q151789'], // Peter the Great – Peter III of Russia
  ['Q83171', 'Q40787'], // Alexander II of Russia – Nicholas II of Russia
  ['Q177854', 'Q131552'], // Lorenzo de' Medici – Catherine de' Medici
  ['Q48544', 'Q177854'], // Cosimo de' Medici – Lorenzo de' Medici
  ['Q49237', 'Q177854'], // Pope Leo X – Lorenzo de' Medici
  ['Q131552', 'Q182021'], // Catherine de' Medici – Marie de' Medici
  ['Q1405', 'Q1413'], // Augustus – Nero
  ['Q1405', 'Q1409'], // Augustus – Caligula
  ['Q1407', 'Q1411'], // Tiberius – Claudius
  ['Q51673', 'Q1413'], // Mark Antony – Nero
  ['Q1405', 'Q1411'], // Augustus – Claudius
  ['Q8413', 'Q33941'], // Constantine the Great – Julian (emperor)
  ['Q635', 'Q168261'], // Cleopatra – Ptolemy I Soter
  ['Q635', 'Q39589'], // Cleopatra – Caesarion
  ['Q12154', 'Q81794'], // Tutankhamun – Akhenaten
  ['Q12154', 'Q42606'], // Tutankhamun – Amenhotep III
  ['Q40930', 'Q12154'], // Nefertiti – Tutankhamun
  ['Q129234', 'Q157899'], // Hatshepsut – Thutmose III
  ['Q34201', 'Q122248'], // Zeus – Heracles
  ['Q34201', 'Q38012'], // Zeus – Hera
  ['Q34201', 'Q41127'], // Zeus – Poseidon
  ['Q93172', 'Q34201'], // Gaia – Zeus
  ['Q79999', 'Q35500'], // Uranus (mythology) – Aphrodite
  ['Q44204', 'Q37340'], // Cronus – Apollo
  ['Q37122', 'Q40901'], // Athena – Ares
  ['Q41410', 'Q45967'], // Hades – Persephone
  ['Q34201', 'Q41484'], // Zeus – Hermes
  ['Q83160', 'Q34201'], // Prometheus – Zeus
  ['Q43610', 'Q42952'], // Odin – Thor
  ['Q42952', 'Q133147'], // Thor – Loki
  ['Q43610', 'Q131658'], // Odin – Baldr
  ['Q131474', 'Q1647325'], // Freyr – Freyja
  ['Q133147', 'Q182560'], // Loki – Fenrir
  ['Q46491', 'Q84122'], // Osiris – Horus
  ['Q1252904', 'Q46491'], // Ra – Osiris
  ['Q79876', 'Q131795'], // Isis – Set (deity)
  ['Q170569', 'Q84122'], // Atum – Horus
  ['Q168444', 'Q47534'], // Geb – Anubis
  ['Q33866', 'Q8007'], // Theodore Roosevelt – Franklin D. Roosevelt
  ['Q83396', 'Q8007'], // Eleanor Roosevelt – Franklin D. Roosevelt
  ['Q83396', 'Q33866'], // Eleanor Roosevelt – Theodore Roosevelt
  ['Q11806', 'Q11816'], // John Adams – John Quincy Adams
  ['Q11806', 'Q458390'], // John Adams – Henry Adams
  ['Q11869', 'Q35678'], // William Henry Harrison – Benjamin Harrison
  ['Q9696', 'Q25310'], // John F. Kennedy – Robert F. Kennedy
  ['Q9696', 'Q1386420'], // John F. Kennedy – Joseph P. Kennedy II
  ['Q313696', 'Q9696'], // Joseph P. Kennedy Sr. – John F. Kennedy
  ['Q134549', 'Q9696'], // Ted Kennedy – John F. Kennedy
  ['Q236540', 'Q230303'], // Rose Kennedy – Caroline Kennedy
  ['Q23505', 'Q207'], // George H. W. Bush – George W. Bush
  ['Q324742', 'Q207'], // Prescott Bush – George W. Bush
  ['Q221997', 'Q207'], // Jeb Bush – George W. Bush
  ['Q324742', 'Q3101841'], // Prescott Bush – George P. Bush
  ['Q1035', 'Q242147'], // Charles Darwin – Emma Darwin
  ['Q234050', 'Q1035'], // Erasmus Darwin – Charles Darwin
  ['Q319331', 'Q1035'], // Josiah Wedgwood – Charles Darwin
  ['Q191026', 'Q1035'], // Francis Galton – Charles Darwin
  ['Q319331', 'Q242147'], // Josiah Wedgwood – Emma Darwin
  ['Q45068', 'Q52927'], // Carl XVI Gustaf – Charles XIV John
  ['Q156390', 'Q52927'], // Victoria, Crown Princess of Sweden – Charles XIV John
  ['Q102139', 'Q151305'], // Margrethe II – Christian IX of Denmark
  ['Q1004037', 'Q151305'], // Frederik X – Christian IX of Denmark
  ['Q165241', 'Q154927'], // Haakon VIII of Norway – Haakon VII
  ['Q165249', 'Q154927'], // Ingrid Alexandra, Crown Princess of Norway – Haakon VII
];
