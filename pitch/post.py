import re, zipfile, shutil
src, dst = "RaktSetu-raw.pptx", "RaktSetu.pptx"
P14='xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
P159='xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main"'
MC='xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
def trans(i):
    if i == 1:
        return f'<mc:AlternateContent {MC}><mc:Choice {P14} Requires="p14"><p:transition spd="slow" p14:dur="2000"><p14:vortex dir="r"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
    return f'<mc:AlternateContent {MC}><mc:Choice {P159} Requires="p159"><p:transition spd="slow" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="1500"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
def timing(ids):
    n=[3]
    def nid(): n[0]+=1; return n[0]
    eff=[]
    for k,sid in enumerate(ids):
        a,b,c,d=nid(),nid(),nid(),nid()
        e,f=nid(),nid()
        eff.append(f'<p:par><p:cTn id="{a}" presetID="42" presetClass="entr" presetSubtype="0" fill="hold" nodeType="withEffect"><p:stCondLst><p:cond delay="{k*180}"/></p:stCondLst><p:childTnLst>'
          f'<p:set><p:cBhvr><p:cTn id="{b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>'
          f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{c}" dur="700"/><p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
          f'<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{d}" dur="700" decel="100000"/><p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl><p:attrNameLst><p:attrName>ppt_x</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_x"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_x"/></p:val></p:tav></p:tavLst></p:anim>'
          f'<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{e}" dur="700" decel="100000"/><p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl><p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y+.1"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav></p:tavLst></p:anim>'
          f'</p:childTnLst></p:cTn></p:par>')
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
      '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
      f'<p:par><p:cTn id="{nid()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' + "".join(eff) + '</p:childTnLst></p:cTn></p:par>'
      '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')
zin=zipfile.ZipFile(src); zout=zipfile.ZipFile(dst,"w",zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data=zin.read(item.filename)
    m=re.match(r"ppt/slides/slide(\d+)\.xml$",item.filename)
    if m:
        x=data.decode("utf-8")
        ids=re.findall(r'<p:cNvPr id="(\d+)" name="a_[^"]*"',x)
        add=trans(int(m.group(1)))+(timing(ids) if ids else "")
        x=re.sub(r'<p:timing>.*?</p:timing>','',x,flags=re.S)
        x=x.replace("</p:clrMapOvr>","</p:clrMapOvr>"+add,1) if "</p:clrMapOvr>" in x else x.replace("</p:cSld>","</p:cSld>"+add,1)
        data=x.encode("utf-8")
    zout.writestr(item,data)
zout.close(); print("ok")
