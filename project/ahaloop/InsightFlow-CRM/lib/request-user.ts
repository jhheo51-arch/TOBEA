import { getChatGPTUser } from "@/app/chatgpt-auth";
import { headers } from "next/headers";
export async function requestUser() {
  if((await headers()).get("sec-fetch-site")==="cross-site")throw new Error("로그인 후 이 사이트 안에서 다시 시도해 주세요.");
  const user=await getChatGPTUser();
  if(!user) throw new Error("로그인 후 이용해 주세요.");
  return user.userId;
}
export function apiError(error:unknown) {
  const auth=error instanceof Error && error.message.includes("로그인");
  console.error(auth?"Authentication required":"AHALOOP operation failed",auth?"":error);
  return Response.json({error:auth?"로그인 후 이용해 주세요.":"저장소 처리에 실패했습니다. 입력을 유지하고 다시 시도해 주세요."},{status:auth?401:503});
}
