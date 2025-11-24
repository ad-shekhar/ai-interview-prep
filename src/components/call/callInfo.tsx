"use client";

import React, { useEffect, useState } from "react";
import { Analytics, CallData } from "@/types/response";
import axios from "axios";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import ReactAudioPlayer from "react-audio-player";
import { DownloadIcon, TrashIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ResponseService } from "@/services/responses.service";
import { useRouter } from "next/navigation";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@nextui-org/react";
import QuestionAnswerCard from "@/components/dashboard/interview/questionAnswerCard";
import { marked } from "marked";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CandidateStatus } from "@/lib/enum";

type CallProps = {
  call_id: string;
  onDeleteResponse: (deletedCallId: string) => void;
  onCandidateStatusChange: (callId: string, newStatus: string) => void;
};

function CallInfo({
  call_id,
  onDeleteResponse,
  onCandidateStatusChange,
}: CallProps) {
  const [call, setCall] = useState<CallData>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [htmlTranscript, setHtmlTranscript] = useState(""); // FIXED
  const [candidateStatus, setCandidateStatus] = useState<string>("");
  const [interviewId, setInterviewId] = useState<string>("");
  const [tabSwitchCount, setTabSwitchCount] = useState<number>();

  /* ------------------------------
      FETCH CALL RESPONSE + ANALYTICS
  ------------------------------- */
  useEffect(() => {
    const fetchResponses = async () => {
      setIsLoading(true);
      setCall(undefined);
      setEmail("");
      setName("");

      try {
        const response = await axios.post("/api/get-call", { id: call_id });
        setCall(response.data.callResponse);
        setAnalytics(response.data.analytics);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponses();
  }, [call_id]);

  /* ------------------------------
      FETCH CANDIDATE DETAILS
  ------------------------------- */
  useEffect(() => {
    const fetchEmail = async () => {
      setIsLoading(true);
      try {
        const response = await ResponseService.getResponseByCallId(call_id);
        setEmail(response.email);
        setName(response.name);
        setCandidateStatus(response.candidate_status);
        setInterviewId(response.interview_id);
        setTabSwitchCount(response.tab_switch_count);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmail();
  }, [call_id]);

  /* ------------------------------
      CLEAN & FORMAT TRANSCRIPT
  ------------------------------- */
  useEffect(() => {
    const replaceAgentAndUser = (transcript: string, name: string): string => {
      const agent = "**AI interviewer:**";
      const user = `**${name}:**`;

      let updated = transcript
        .replace(/Agent:/g, agent)
        .replace(/User:/g, user);

      return updated.replace(/(?:\r\n|\r|\n)/g, "\n\n");
    };

    if (call && name) {
      setTranscript(replaceAgentAndUser(call?.transcript as string, name));
    }
  }, [call, name]);

  /* ------------------------------
      FIXED: Convert Markdown → HTML Safely
  ------------------------------- */
  useEffect(() => {
    async function convertMd() {
      if (!transcript) return;
      const parsed = await marked.parse(transcript);
      setHtmlTranscript(parsed);
    }
    convertMd();
  }, [transcript]);

  /* ------------------------------
      DELETE RESPONSE
  ------------------------------- */
  const onDeleteResponseClick = async () => {
    try {
      const response = await ResponseService.getResponseByCallId(call_id);

      if (response) {
        const interview_id = response.interview_id;

        await ResponseService.deleteResponse(call_id);

        router.push(`/interviews/${interview_id}`);

        onDeleteResponse(call_id);
      }

      toast.success("Response deleted successfully.", {
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error deleting response:", error);

      toast.error("Failed to delete the response.", {
        position: "bottom-right",
        duration: 3000,
      });
    }
  };

  return (
    <div className="h-screen z-[10] mx-2 mb-[100px] overflow-y-scroll">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-[75%] w-full">
          <LoaderWithText />
        </div>
      ) : (
        <>
          {/* ---------- HEADER & USER INFO ---------- */}
          <div className="bg-slate-200 rounded-2xl min-h-[120px] p-4 px-5">
            <div className="flex justify-between items-center pb-4 pr-2">
              <div
                className="inline-flex items-center text-indigo-600 hover:cursor-pointer"
                onClick={() => router.push(`/interviews/${interviewId}`)}
              >
                <ArrowLeft className="mr-2" />
                <p className="text-sm font-semibold">Back to Summary</p>
              </div>

              {tabSwitchCount && tabSwitchCount > 0 && (
                <p className="text-sm font-semibold text-red-500 bg-red-200 rounded-sm px-2 py-1">
                  Tab Switching Detected
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback>{name ? name[0] : "A"}</AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-sm">{email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={candidateStatus}
                  onValueChange={async (newValue) => {
                    setCandidateStatus(newValue);
                    await ResponseService.updateResponse(
                      { candidate_status: newValue },
                      call_id,
                    );
                    onCandidateStatusChange(call_id, newValue);
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-slate-50 rounded-2xl">
                    <SelectValue placeholder="No Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CandidateStatus.NO_STATUS}>No Status</SelectItem>
                    <SelectItem value={CandidateStatus.NOT_SELECTED}>Not Selected</SelectItem>
                    <SelectItem value={CandidateStatus.POTENTIAL}>Potential</SelectItem>
                    <SelectItem value={CandidateStatus.SELECTED}>Selected</SelectItem>
                  </SelectContent>
                </Select>

                <AlertDialog>
                  <AlertDialogTrigger>
                    <Button className="bg-red-500 hover:bg-red-600 p-2">
                      <TrashIcon size={16} />
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-indigo-600 hover:bg-indigo-800"
                        onClick={onDeleteResponseClick}
                      >
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* ---------- AUDIO PLAYER ---------- */}
            <div className="mt-3">
              <p className="font-semibold">Interview Recording</p>
              <div className="flex gap-3 mt-2">
                {call?.recording_url && (
                  <ReactAudioPlayer src={call?.recording_url} controls />
                )}
                <a href={call?.recording_url} download="">
                  <DownloadIcon size={20} />
                </a>
              </div>
            </div>
          </div>

          {/* ---------- ANALYTICS ---------- */}
          <div className="bg-slate-200 rounded-2xl p-4 my-3">
            <p className="font-semibold my-2">General Summary</p>

            <div className="grid grid-cols-3 gap-4 my-4">
              {/* OVERALL SCORE */}
              {analytics?.overallScore !== undefined && (
                <div className="p-4 text-sm bg-slate-50 rounded-2xl">
                  <div className="flex gap-3">
                    <CircularProgress
                      classNames={{
                        svg: "w-28 h-28",
                        indicator: "stroke-indigo-600",
                        track: "stroke-indigo-600/10",
                        value: "text-3xl font-semibold text-indigo-600",
                      }}
                      value={analytics?.overallScore}
                      strokeWidth={4}
                      showValueLabel
                    />
                    <p className="text-xl font-medium my-auto">
                      Overall Hiring Score
                    </p>
                  </div>

                  <p>
                    <span className="font-normal">Feedback: </span>
                    {analytics?.overallFeedback ?? (
                      <Skeleton className="w-[200px] h-[20px]" />
                    )}
                  </p>
                </div>
              )}

              {/* COMMUNICATION */}
              {analytics?.communication && (
                <div className="p-4 text-sm bg-slate-50 rounded-2xl">
                  <div className="flex gap-3">
                    <CircularProgress
                      classNames={{
                        svg: "w-28 h-28",
                        indicator: "stroke-indigo-600",
                        track: "stroke-indigo-600/10",
                        value: "text-3xl font-semibold text-indigo-600",
                      }}
                      value={analytics.communication.score}
                      maxValue={10}
                      strokeWidth={4}
                      showValueLabel={true}
                      valueLabel={
                        <div className="flex items-baseline">
                          {analytics.communication.score}
                          <span className="text-xl ml-1">/10</span>
                        </div>
                      }
                    />
                    <p className="text-xl font-medium my-auto">Communication</p>
                  </div>

                  <p>
                    <span className="font-normal">Feedback: </span>
                    {analytics.communication.feedback ?? (
                      <Skeleton className="w-[200px] h-[20px]" />
                    )}
                  </p>
                </div>
              )}

              {/* SENTIMENT + CALL SUMMARY */}
              <div className="p-4 text-sm bg-slate-50 rounded-2xl">
                <p className="flex items-center gap-2">
                  User Sentiment:
                  <span className="font-medium">
                    {call?.call_analysis?.user_sentiment ?? (
                      <Skeleton className="w-[150px] h-[20px]" />
                    )}
                  </span>

                  <span
                    className={`text-xl ${
                      call?.call_analysis?.user_sentiment === "Positive"
                        ? "text-green-500"
                        : call?.call_analysis?.user_sentiment === "Negative"
                        ? "text-red-500"
                        : call?.call_analysis?.user_sentiment === "Neutral"
                        ? "text-yellow-500"
                        : "text-transparent"
                    }`}
                  >
                    ●
                  </span>
                </p>

                <p className="mt-2">
                  <span className="font-normal">Call Summary: </span>
                  {call?.call_analysis?.call_summary ?? (
                    <Skeleton className="w-[200px] h-[20px]" />
                  )}
                </p>

                <p className="font-medium mt-2">
                  {call?.call_analysis?.call_completion_rating_reason}
                </p>
              </div>
            </div>
          </div>

          {/* ---------- QUESTION SUMMARIES ---------- */}
          {analytics?.questionSummaries?.length > 0 && (
            <div className="bg-slate-200 rounded-2xl p-4 my-3">
              <p className="font-semibold my-2 mb-4">Question Summary</p>

              <ScrollArea className="h-72 rounded-md text-sm py-3 px-2 overflow-y-scroll leading-6 whitespace-pre-line">
                {analytics.questionSummaries.map((qs, index) => (
                  <QuestionAnswerCard
                    key={qs.question}
                    questionNumber={index + 1}
                    question={qs.question}
                    answer={qs.summary}
                  />
                ))}
              </ScrollArea>
            </div>
          )}

          {/* ---------- TRANSCRIPT (FIXED) ---------- */}
          <div className="bg-slate-200 rounded-2xl p-4 mb-[150px]">
            <p className="font-semibold my-2 mb-4">Transcript</p>

            <ScrollArea className="rounded-2xl text-sm h-96 overflow-y-auto whitespace-pre-line px-2">
              <div
                className="text-sm p-4 rounded-2xl leading-5 bg-slate-50"
                dangerouslySetInnerHTML={{ __html: htmlTranscript }}
              />
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

export default CallInfo;
