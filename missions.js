/* 교사가 수정할 학습 데이터. 교과서 86~101쪽 기반. 가상 국가와 갈등 사례는 학습용 창작입니다. */
// World distances, physical clearances, and rendering share these values.
window.SAILING = {width:5250,height:4620,layoutVersion:2,spacingScale:2.1,islandScale:1.5,boatScale:1.8,boatRadius:72,harborOffset:135,dockRadius:144,speed:320};
window.LESSONS = [
 {name:'무역의 시작섬',short:'시작섬',icon:'🌴',x:650,y:650,r:150,color:'#7abf67',npc:'탐험 안내원 나루',avatar:'🧑‍✈️',type:'quiz',reward:100,goal:'무역에 해당하는 상황을 찾아요.',intro:'나라 사이에서 물건이나 서비스를 사고파는 장면을 찾아볼까요?',summary:'무역은 나라와 나라 사이에 물건이나 서비스를 사고파는 것이에요.',page:'88~89쪽',questions:[{q:'어떤 상황이 무역일까요?',options:['우리 동네 가게에서 국내산 사과를 샀어요.','우리나라 라면을 브라질에 팔았어요.','친구에게 연필을 빌렸어요.'],answer:1,hint:'사고파는 일이 나라와 나라 사이에서 일어났는지 살펴보세요.'},{q:'물건이 아닌 것도 무역할 수 있을까요?',options:['아니요. 상자에 담긴 물건만 무역해요.','아니요. 음식만 무역해요.','네. 우리나라 영화의 이용권을 외국에 팔아도 무역이에요.'],answer:2,hint:'교과서에서는 물건과 함께 ‘서비스’도 사고판다고 했어요.'}]},
 {name:'수출입 항구섬',short:'항구섬',icon:'🏗️',x:1300,y:450,r:155,color:'#72bdb0',npc:'항구지기 보라',avatar:'👩‍🔧',type:'sort',reward:150,goal:'우리나라 입장에서 수출과 수입을 분류해요.',intro:'모든 카드는 우리나라 입장이에요. 카드를 창고에 끌어 놓거나, 카드와 창고를 차례로 눌러 주세요.',summary:'다른 나라에 파는 것은 수출, 다른 나라에서 사 오는 것은 수입이에요.',page:'88~89쪽',cards:[{text:'📱 한국 스마트폰 → 인도에 판매',answer:'export'},{text:'🍌 필리핀 바나나 → 한국이 구매',answer:'import'},{text:'🎬 한국 영화 → 미국에 판매',answer:'export'},{text:'🛢️ 외국의 원유 → 한국이 구매',answer:'import'}]},
 {name:'자원 부족섬',short:'자원섬',icon:'⛰️',x:2000,y:820,r:165,color:'#afbd74',npc:'발명가 두리',avatar:'🧑‍🔬',type:'resource',reward:200,goal:'자원섬의 의뢰를 받고 다른 섬에서 목재를 구해 와요.',intro:'우리 섬은 전자 제품 기술이 좋지만 목재가 부족해요. 시작섬은 나무가 잘 자라요. 전자 제품을 가져가 목재와 교환해 줄래요?',summary:'나라마다 자연환경·자원·기술·노동력이 달라 무역으로 서로 필요한 것을 구해요.',page:'90~91쪽'},
 {name:'세계 교역섬',short:'교역섬',icon:'🌍',x:1750,y:1550,r:170,color:'#71b796',npc:'교역 연구원 루미',avatar:'🧑‍🏫',type:'match',reward:250,goal:'생산 조건에 맞는 교역 상대를 연결해요.',intro:'아래는 가상의 나라들이에요. 필요한 물건을 잘 만드는 나라와 연결해 보세요.',summary:'잘 생산하는 상품을 수출하고 생산에 불리한 상품을 수입하면 서로 이익을 얻을 수 있어요.',page:'90~94쪽',pairs:[{label:'가 나라: 전자 기술이 뛰어나지만 목재가 부족해요.',answer:'forest'},{label:'나 나라: 목재는 풍부하지만 전자 제품이 부족해요.',answer:'tech'},{label:'다 나라: 추운 기후라 열대 과일을 기르기 어려워요.',answer:'tropic'}],options:[{value:'',text:'교역 상대 선택'},{value:'tech',text:'전자 제품을 잘 만드는 나라'},{value:'tropic',text:'따뜻한 기후에서 바나나를 기르는 나라'},{value:'forest',text:'나무가 잘 자라 목재가 풍부한 나라'}]},
 {name:'무역 갈등섬',short:'갈등섬',icon:'🏭',x:900,y:1700,r:160,color:'#c1b789',npc:'협상가 마루',avatar:'👩‍💼',type:'quiz',reward:300,goal:'경쟁과 공급 문제를 슬기롭게 해결해요.',intro:'교과서의 경쟁과 상호 의존을 바탕으로 만든 가상 상황이에요. 함께 이익을 얻는 방법을 생각해 봐요.',summary:'나라들은 기술과 가격으로 경쟁하면서도, 필요한 물건과 정보를 주고받으며 상호 의존해요.',page:'95~99쪽',questions:[{q:'두 나라가 같은 종류의 배터리를 수출해요. 바람직한 경쟁 방법은?',options:['서로의 상품에 대해 거짓 소문을 퍼뜨려요.','안전한 새 기술을 개발하고 품질을 높여요.','다른 나라의 모든 상품을 무조건 금지해요.'],answer:1,hint:'경쟁은 기술이 발전하고 상품의 품질이 좋아지는 계기가 될 수 있어요.'},{q:'밀 수출국에 가뭄이 들어 우리나라 빵 공장이 어려워졌어요. 어떤 계획이 좋을까요?',options:['공급 상황을 함께 확인하고 여러 나라와 협력해 밀을 구해요.','우리 생활과 외국의 상황은 전혀 관계없다고 생각해요.','밀을 구할 방법을 알아보지 않고 기다리기만 해요.'],answer:0,hint:'한 나라의 변화가 다른 나라의 생산과 생활에 영향을 줄 수 있어요.'}]},
 {name:'상생의 섬',short:'상생섬',icon:'🏛️',x:380,y:1250,r:160,color:'#9ec87c',npc:'세계 무역 의장 해솔',avatar:'🧑‍⚖️',type:'plan',reward:0,goal:'서로 이익을 얻는 세 나라의 교역 계획을 완성해요.',intro:'마지막 도전이에요! 앞의 다섯 섬을 마친 뒤 세 나라가 모두 필요한 것을 얻도록 항로를 연결해 주세요.',summary:'세계 여러 나라는 경쟁하는 동시에 상호 의존하며, 협력으로 함께 이익을 얻을 수 있어요.',page:'96~100쪽',pairs:[{label:'가 나라: 전자 제품을 생산해요. 목재가 필요해요. 전자 제품을 어디로 보낼까요?',answer:'b'},{label:'나 나라: 목재를 생산해요. 밀이 필요해요. 목재를 어디로 보낼까요?',answer:'a'},{label:'다 나라: 밀을 생산해요. 전자 제품이 필요해요. 밀을 어디로 보낼까요?',answer:'c'}],options:[{value:'',text:'받을 나라 선택'},{value:'a',text:'가 나라 — 목재가 필요해요'},{value:'b',text:'다 나라 — 전자 제품이 필요해요'},{value:'c',text:'나 나라 — 밀이 필요해요'}]}
];

for (const island of window.LESSONS) {
  island.legacy = {x:island.x,y:island.y,r:island.r};
  island.x *= SAILING.spacingScale;
  island.y *= SAILING.spacingScale;
  island.r *= SAILING.islandScale;
  island.visualScale = SAILING.islandScale;
  island.harbor = {x:island.x,y:island.y+island.r+SAILING.harborOffset};
}
