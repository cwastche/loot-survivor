import { useEffect } from "react";
import { useContracts } from "../hooks/useContracts";
import { NullBeast } from "../types";
import { useQuery } from "@apollo/client";
import {
  getBeastById,
  getBattlesByBeast,
  getLastBattleByAdventurer,
} from "../hooks/graphql/queries";
import { useTransactionManager, useContractWrite } from "@starknet-react/core";
import KeyboardControl, { ButtonData } from "./KeyboardControls";
import Info from "./Info";
import { BattleDisplay } from "./BattleDisplay";
import { BeastDisplay } from "./BeastDisplay";
import useLoadingStore from "../hooks/useLoadingStore";
import useTransactionCartStore from "../hooks/useTransactionCartStore";
import useAdventurerStore from "../hooks/useAdventurerStore";

export default function Beast() {
  const calls = useTransactionCartStore((state) => state.calls);
  const addToCalls = useTransactionCartStore((state) => state.addToCalls);
  const handleSubmitCalls = useTransactionCartStore(
    (state) => state.handleSubmitCalls
  );
  const { beastContract } = useContracts();
  const { addTransaction } = useTransactionManager();
  const adventurer = useAdventurerStore((state) => state.adventurer);
  const { writeAsync } = useContractWrite({ calls });
  const hash = useLoadingStore((state) => state.hash);
  const loading = useLoadingStore((state) => state.loading);
  const startLoading = useLoadingStore((state) => state.startLoading);
  const type = useLoadingStore((state) => state.type);
  const updateData = useLoadingStore((state) => state.updateData);

  const {
    loading: lastBattleLoading,
    error: lastBattleError,
    data: lastBattleData,
    refetch: lastBattleRefetch,
  } = useQuery(getLastBattleByAdventurer, {
    variables: {
      adventurerId: adventurer?.id,
    },
    pollInterval: 5000,
  });

  const {
    loading: battlesByBeastLoading,
    error: battlesByBeastError,
    data: battlesByBeastData,
    refetch: battlesByBeastRefetch,
  } = useQuery(getBattlesByBeast, {
    variables: {
      adventurerId: adventurer?.id,
      beastId: adventurer?.beastId
        ? adventurer?.beastId
        : lastBattleData?.battles[0]?.beastId,
    },
    pollInterval: 5000,
  });

  const formatBattles = battlesByBeastData ? battlesByBeastData.battles : [];

  const {
    loading: beastByTokenIdLoading,
    error: beastByTokenIdError,
    data: beastByTokenIdData,
    refetch: beastByTokenIdRefetch,
  } = useQuery(getBeastById, {
    variables: {
      id: adventurer?.beastId
        ? adventurer?.beastId
        : lastBattleData?.battles[0]?.beastId,
    },
    pollInterval: 5000,
  });

  let beastData = beastByTokenIdData ? beastByTokenIdData.beasts[0] : NullBeast;

  const attack = {
    contractAddress: beastContract?.address ?? "",
    entrypoint: "attack",
    calldata: [adventurer?.beastId ?? "", "0"],
  };

  const flee = {
    contractAddress: beastContract?.address ?? "",
    entrypoint: "flee",
    calldata: [adventurer?.beastId ?? "", "0"],
  };

  const buttonsData: ButtonData[] = [
    {
      id: 1,
      label: "ATTACK BEAST!",
      action: async () => {
        addToCalls(attack);
        await handleSubmitCalls(writeAsync).then((tx: any) => {
          if (tx) {
            startLoading(
              "Attack",
              tx.transaction_hash,
              "Attacking",
              formatBattles,
              { beastName: beastData.beast }
            );
            addTransaction({
              hash: tx.transaction_hash,
              metadata: {
                method: "Attack Beast",
                description: `Attacking ${beastData.beast}`,
              },
            });
          }
        });
      },
    },
    {
      id: 2,
      label: "FLEE BEAST",
      action: async () => {
        addToCalls(flee);
        await handleSubmitCalls(writeAsync).then((tx: any) => {
          if (tx) {
            startLoading(
              "Flee",
              tx.transaction_hash,
              "Fleeing",
              formatBattles,
              { beastName: beastData.beast }
            );
            addTransaction({
              hash: tx.transaction_hash,
              metadata: {
                method: "Flee Beast",
                description: `Fleeing from ${beastData.beast}`,
              },
            });
          }
        });
      },
    },
  ];

  const isBeastDead = beastData?.health == "0";

  useEffect(() => {
    if (loading && (type == "Attack" || type == "Flee")) {
      updateData(formatBattles);
    }
  }, [loading, formatBattles]);

  return (
    <div className="flex flex-row space-x-6">
      <div className="w-1/3">
        <Info adventurer={adventurer} />
      </div>
      <div className="flex flex-col w-1/3 gap-10">
        {!isBeastDead && (
          <KeyboardControl
            buttonsData={buttonsData}
            disabled={adventurer?.beastId == undefined || loading}
          />
        )}

        {(adventurer?.beastId || lastBattleData?.battles[0]) && (
          <>
            <div className="flex flex-col items-center gap-5 p-2">
              <div className="text-xl uppercase">
                Battle log with {beastData.beast}
              </div>
              <div className="flex flex-col gap-2">
                {formatBattles.map((battle: any, index: number) => (
                  <BattleDisplay
                    key={index}
                    battleData={battle}
                    beastName={beastData.beast}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-row w-1/3 ">
        {adventurer?.beastId || lastBattleData?.battles[0] ? (
          <>
            <BeastDisplay beastData={beastData} />
          </>
        ) : (
          <p className="m-auto text-lg uppercase text-terminal-green">
            Beast not yet discovered.
          </p>
        )}
      </div>
    </div>
  );
}
