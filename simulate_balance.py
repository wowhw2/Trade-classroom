"""무역놀이 1차 밸런스 Monte Carlo 모델.
실제 학생 행동을 예측하는 모델이 아니라, 공급량/재고폐기/현금흐름/건설가능성을 비교하는 휴리스틱 모델이다.
"""
import random, statistics, csv
RES=range(6)
NEEDS=[[2,3,1,1,3,2],[2,2,2,2,2,2],[2,1,3,2,3,1],[2,1,3,2,1,3],[2,2,1,3,2,2],[2,3,2,2,1,2]]
FAC=[('고속도로',14,'production',1),('항구',22,'production',2),('공항',22,'production',2),('병원',14,'reward',1),('학교',22,'reward',2),('공원',14,'reward',1),('지하철',16,'production',1),('장애인 편의시설',14,'reward',1),('유기동물 보호시설',14,'reward',1)]
TRADE_P=[.78,.86,.91,.94,.96,.97]
def game(base=12,reward=10,penalty=1,cap=5,seed=0):
 r=random.Random(seed); inv=[[0]*6 for _ in range(6)]; cash=[20]*6; built=[[] for _ in range(6)]; shortage=[]; waste=[0]*6; full=[0]*6
 for rd in range(1,7):
  for i in range(6): inv[i][i]+=base+sum(FAC[j][3] for j in built[i] if FAC[j][2]=='production')
  p=TRADE_P[rd-1]
  for k in RES:
   ds=[i for i in RES if inv[i][k]<NEEDS[i][k]]; ss=[i for i in RES if inv[i][k]>NEEDS[i][k]]; r.shuffle(ds);r.shuffle(ss)
   for d in ds:
    need=NEEDS[d][k]-inv[d][k]
    for s in ss:
     avail=max(0,inv[s][k]-NEEDS[s][k])
     for _ in range(min(need,avail)):
      if r.random()<p:
       inv[s][k]-=1;inv[d][k]+=1;need-=1
       price=r.choice([1,1,2])
       if cash[d]>=price: cash[d]-=price;cash[s]+=price
      if need<=0: break
     if need<=0: break
  for i in RES:
   miss=0
   for k in RES:
    u=min(inv[i][k],NEEDS[i][k]);inv[i][k]-=u;miss+=NEEDS[i][k]-u
   rb=sum(FAC[j][3] for j in built[i] if FAC[j][2]=='reward');cash[i]+=max(0,reward+rb-penalty*miss);shortage.append(miss);full[i]+=miss==0
   for k in RES:
    if inv[i][k]>cap:waste[i]+=inv[i][k]-cap;inv[i][k]=cap
  if rd>=3:
   for i in RES:
    choices=[j for j,f in enumerate(FAC) if j not in built[i] and cash[i]>=f[1]+6]
    if choices:
     rem=6-rd
     score=lambda j:FAC[j][3]*(rem+.5)/FAC[j][1]+r.random()*.03
     j=max(choices,key=score);built[i].append(j);cash[i]-=FAC[j][1]
     if cash[i]>=24 and r.random()<.25:
      c=[j for j,f in enumerate(FAC) if j not in built[i] and cash[i]>=f[1]+6]
      if c:j=max(c,key=score);built[i].append(j);cash[i]-=FAC[j][1]
 assets=[cash[i]+sum(FAC[j][1] for j in built[i]) for i in RES]
 return {'avg_shortage':sum(shortage)/len(shortage),'full_rate':sum(full)/36,'avg_waste':sum(waste)/6,'avg_buildings':sum(map(len,built))/6,'avg_assets':sum(assets)/6,'avg_cash':sum(cash)/6}
def avg(cfg,n=2000):
 out=[game(**cfg,seed=i) for i in range(n)];return {k:statistics.mean(x[k] for x in out) for k in out[0]}
if __name__=='__main__':
 rows=[]
 for base in [11,12,13,14,15]: rows.append({'scenario':f'생산 {base}','base':base,'reward':10,'penalty':1,**avg({'base':base})})
 for reward in [8,9,10,11,12]: rows.append({'scenario':f'보상 {reward}','base':12,'reward':reward,'penalty':1,**avg({'reward':reward})})
 with open('balance_results.csv','w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
 print('balance_results.csv 생성 완료')
