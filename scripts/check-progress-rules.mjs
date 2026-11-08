// Read-only local check. This does not fetch or deploy Firebase rules.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
export function checkProgressRules(source, now = new Date()) {
  const text=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')
  const deadlines=[...text.matchAll(/timestamp\.date\(\s*(\d{4})\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)].map(match=>{
    const date=new Date(Date.UTC(+match[1],+match[2]-1,+match[3]))
    return {date:date.toISOString().slice(0,10),daysRemaining:Math.ceil((date-now)/86400000)}
  })
  const warnings=[]
  if (/match\s+\/\{\w+=\*\*\}/.test(text) && /allow\s+(?:read\s*,\s*write|write|create|update|delete)[^;]*:\s*if\s+(?:true|request\.time)/.test(text)) warnings.push('Possible broad write grant: review all overlapping matches; a scoped deny cannot override it.')
  if (deadlines.some(d=>d.daysRemaining<=14)) warnings.push('Temporary rule expires within 14 days or has expired. Review unrelated paths before changing its deadline.')
  return {deadlines,warnings,conclusion:'Heuristic only; effective rules and overlapping allows require review before publication.'}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv[2])throw new Error('Usage: node scripts/check-progress-rules.mjs effective.rules')
  console.log(JSON.stringify(checkProgressRules(await readFile(process.argv[2],'utf8')),null,2))
}
