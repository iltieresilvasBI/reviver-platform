import ts from "typescript";
import {readdirSync, readFileSync, existsSync} from "node:fs";
import {join,relative} from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const pages=[];
function walk(dir){
  if(!existsSync(dir))return;
  for(const d of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,d.name);
    if(d.isDirectory())walk(p);
    else if(d.isFile()&&d.name.endsWith(".tsx"))pages.push(p);
  }
}
walk(join(root,"app","worship"));
let controls=0,checkedRoutes=0,dynamicLinks=0;
const errors=[];
const routeExists=(url)=>{
  const pathname=url.split(/[?#]/)[0];
  if(!pathname.startsWith("/"))return true;
  const parts=pathname.split("/").filter(Boolean);
  if(parts.some(p=>p.startsWith("[")))return true;
  const base=join(root,"app",...parts);
  return [join(base,"page.tsx"),join(base,"route.ts"),join(base,"route.tsx")].some(existsSync);
};
for(const path of pages){
  const file=ts.createSourceFile(path,readFileSync(path,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const label=relative(root,path);
  const visit=(node,inForm=false,inSummary=false)=>{
    let form=inForm,summary=inSummary;
    if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)){
      const opening=ts.isJsxElement(node)?node.openingElement:node;
      const name=opening.tagName.getText(file);
      const attrs=opening.attributes.properties;
      const prop=(key)=>attrs.find(a=>ts.isJsxAttribute(a)&&a.name.text===key);
      if(name==="form"){
        form=true;
        if(!prop("action")&&!prop("method"))errors.push(label+": form without action/method @ "+file.getLineAndCharacterOfPosition(node.pos).line);
      }
      if(name==="summary")summary=true;
      if(["button","SubmitButton","Link","a"].includes(name)){
        controls++;
        if(inSummary)errors.push(label+": interactive control nested in summary: "+name);
        if(name==="button"||name==="SubmitButton"){
          if(!inForm&&!prop("onClick")&&!prop("form"))errors.push(label+": inert-looking "+name+" outside form");
          if(name==="SubmitButton"&&!inForm)errors.push(label+": SubmitButton has no form");
        }else{
          const h=prop("href");
          if(!h||!ts.isJsxAttribute(h))errors.push(label+": link has no href");
          else if(h.initializer&&ts.isStringLiteral(h.initializer)){
            const href=h.initializer.text;
            if(href.startsWith("/")){
              checkedRoutes++;
              if(!routeExists(href))errors.push(label+": missing route "+href);
            }else if(href==="#"||href==="")errors.push(label+": dead link "+href);
          }else dynamicLinks++;
        }
      }
    }
    if(ts.isJsxElement(node)){
      for(const child of node.children)visit(child,form,summary);
    }else if(ts.isJsxFragment(node)){
      for(const child of node.children)visit(child,form,summary);
    }else if(ts.isJsxExpression(node)){
      if(node.expression)ts.forEachChild(node.expression,child=>visit(child,form,summary));
    }else if(ts.isJsxSelfClosingElement(node)){}
    else ts.forEachChild(node,child=>visit(child,form,summary));
  };
  visit(file);
}
console.log(JSON.stringify({tsxFiles:pages.length,clickableControls:controls,staticLocalRoutes:checkedRoutes,dynamicLinksRequireRuntimeTesting:dynamicLinks,issues:errors},null,2));
assert.equal(errors.length,0,"Worship control audit found "+errors.length+" issues");
