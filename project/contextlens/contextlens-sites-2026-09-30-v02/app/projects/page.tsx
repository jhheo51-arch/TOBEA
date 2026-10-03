import { redirect } from "next/navigation";
export default async function Projects({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  redirect('/projects.html'+(typeof params.case==='string'?'?case='+encodeURIComponent(params.case):''));
}
