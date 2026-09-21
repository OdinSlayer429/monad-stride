"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { getPoolTitle } from "~~/services/stride/poolMeta";
import { Participant, ParticipantStatus, Pool, PoolStatus } from "~~/types/stride";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function deriveStatus(
  nowMs: number,
  joinDeadlineMs: number,
  activityDeadlineMs: number,
  disputeWindowEndMs: number,
  finalized: boolean,
): PoolStatus {
  if (finalized) return "resolved";
  if (nowMs > disputeWindowEndMs) return "awaiting_results";
  if (nowMs > joinDeadlineMs) return "active";
  return "open";
}

// Contract's SubmissionStatus enum: None = 0, Submitted = 1, Slashed = 2.
function deriveParticipantStatus(
  submissionStatus: number,
  distanceMeters: bigint,
  goalDistanceMeters: bigint,
): ParticipantStatus {
  if (submissionStatus === 2) return "slashed";
  if (submissionStatus === 1) return distanceMeters >= goalDistanceMeters ? "hit_goal" : "didnt_submit";
  return "joined";
}

/**
 * Real on-chain pools — reads `poolCount`, then `getPool`/`submissions` for
 * every pool, straight from the Stride contract (no localStorage). Pool
 * titles are the one cosmetic exception, see services/stride/poolMeta.ts.
 */
export function useStridePools() {
  const { address: connectedAddress } = useAccount();
  const { data: stride, isLoading: contractLoading } = useScaffoldContract({ contractName: "Stride" });
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!stride) {
      // Still resolving which contract/network to use — keep the spinner up.
      // Once that settles (found or not), stop showing an infinite spinner even if
      // the contract genuinely can't be reached (e.g. wrong network, dead RPC).
      setIsLoading(contractLoading);
      return;
    }
    setIsLoading(true);
    try {
      const poolCount = await stride.read.poolCount();
      const poolIds = Array.from({ length: Number(poolCount) }, (_, i) => BigInt(i));

      const loaded = await Promise.all(
        poolIds.map(async poolId => {
          const p = await stride.read.getPool([poolId]);

          const participants: Participant[] = await Promise.all(
            p.participants.map(async addr => {
              // submissions(poolId, addr) returns a labeled tuple, not an object —
              // [status, commitHash, distanceMeters, durationSeconds, checkpointCount, ipfsCID, submittedAt, signingKey]
              const [
                subStatus,
                commitHash,
                subDistanceMeters,
                subDurationSeconds,
                checkpointCount,
                ipfsCID,
                submittedAt,
              ] = await stride.read.submissions([poolId, addr]);
              const status = deriveParticipantStatus(subStatus, subDistanceMeters, p.goalDistanceMeters);
              const isYou = !!connectedAddress && addr.toLowerCase() === connectedAddress.toLowerCase();
              return {
                address: addr,
                name: isYou ? "You" : shortAddress(addr),
                avatar: isYou ? "🔥" : "🏃",
                status,
                distanceMeters: Number(subDistanceMeters),
                durationSeconds: Number(subDurationSeconds),
                isDisputed: status === "slashed",
                // Only real once subStatus !== None (0) — a real submission exists to
                // dispute. checkpoints stays empty here (fetched on-demand from IPFS
                // only when a disputer actually opens the inspector, not on every poll).
                submission:
                  subStatus === 0
                    ? undefined
                    : {
                        commitHash,
                        distanceMeters: Number(subDistanceMeters),
                        durationSeconds: Number(subDurationSeconds),
                        checkpointCount: Number(checkpointCount),
                        checkpoints: [],
                        ipfsCID,
                        submittedAt: Number(submittedAt) * 1000,
                      },
              };
            }),
          );

          const nowMs = Date.now();
          const joinDeadlineMs = Number(p.joinDeadline) * 1000;
          const activityDeadlineMs = Number(p.activityDeadline) * 1000;
          const disputeWindowEndMs = activityDeadlineMs + Number(p.disputeWindow) * 1000;
          const idStr = poolId.toString();
          const isCreatorYou = !!connectedAddress && p.creator.toLowerCase() === connectedAddress.toLowerCase();

          const claimableWei = connectedAddress ? await stride.read.claimable([poolId, connectedAddress]) : 0n;

          const pool: Pool = {
            id: idStr,
            title: getPoolTitle(idStr) ?? `pool #${idStr}`,
            creator: p.creator,
            creatorName: isCreatorYou ? "You" : shortAddress(p.creator),
            stakeAmount: `${formatEther(p.stakeAmount)} MON`,
            stakeAmountWei: p.stakeAmount,
            goalDistanceMeters: Number(p.goalDistanceMeters),
            joinDeadline: joinDeadlineMs,
            activityDeadline: activityDeadlineMs,
            disputeWindowSeconds: Number(p.disputeWindow),
            status: deriveStatus(nowMs, joinDeadlineMs, activityDeadlineMs, disputeWindowEndMs, p.finalized),
            participants,
            inviteCode: idStr,
            totalPot: `${formatEther(p.stakeAmount * BigInt(participants.length))} MON`,
            finalized: p.finalized,
            claimableWei,
          };
          return pool;
        }),
      );

      setPools(loaded.reverse()); // newest first
    } catch (err) {
      console.error("Stride: failed to read pools from the contract", err);
    } finally {
      setIsLoading(false);
    }
  }, [stride, contractLoading, connectedAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pools, isLoading, refetch };
}
