"use client";
import { WalletModal } from "@/components/connect-modal";
import { UserNFTs } from "@/components/UserNFTs";
import { useNFT } from "@/hooks/useNFTInteraction";
import { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

// function CountdownTimer({ currentPhase }: { currentPhase?: string }) {
//   const [timeRemaining, setTimeRemaining] = useState<{
//     days: number;
//     hours: number;
//     minutes: number;
//     seconds: number;
//   }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

//   useEffect(() => {
//     const getTargetDate = () => {
//       const whitelistEndDate = new Date("2025-04-04T13:00:00Z");

//       const fcfsEndDate = new Date("2025-04-05T13:00:00Z");

//       if (currentPhase === "Whitelist" || currentPhase === "OG_SALE") {
//         return whitelistEndDate;
//       } else if (currentPhase === "First Come First Served") {
//         return fcfsEndDate;
//       }

//       return whitelistEndDate;
//     };

//     const calculateTimeRemaining = () => {
//       const targetDate = getTargetDate();
//       const now = new Date();
//       const difference = targetDate.getTime() - now.getTime();

//       if (difference <= 0) {
//         return { days: 0, hours: 0, minutes: 0, seconds: 0 };
//       }

//       const days = Math.floor(difference / (1000 * 60 * 60 * 24));
//       const hours = Math.floor(
//         (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
//       );
//       const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
//       const seconds = Math.floor((difference % (1000 * 60)) / 1000);

//       return { days, hours, minutes, seconds };
//     };

//     const timer = setInterval(() => {
//       setTimeRemaining(calculateTimeRemaining());
//     }, 1000);

//     setTimeRemaining(calculateTimeRemaining());

//     return () => clearInterval(timer);
//   }, [currentPhase]);

//   const formatNumber = (num: number) => (num < 10 ? `0${num}` : num);

//   return (
//     <div className="flex items-center gap-1 sm:gap-2 uppercase">
//       {timeRemaining.days > 0 && <span>{timeRemaining.days}d</span>}
//       <span>{formatNumber(timeRemaining.hours)}h</span>
//       <span>{formatNumber(timeRemaining.minutes)}m</span>
//       <span>{formatNumber(timeRemaining.seconds)}s</span>
//     </div>
//   );
// }

export function NFT() {
  const { address, chainId, isDisconnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== 10143;
  const [open, setOpen] = useState(false);
  const [mintingStep, setMintingStep] = useState<
    "idle" | "preparing" | "confirming" | "success" | "error"
  >("idle");
  const [, setLastMintedNFT] = useState<{
    id: string;
    image: string;
  } | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    maxSupply,
    totalMinted,
    isPaused,
    mint,
    isSuccess: isMintSuccess,
    userMintStatus,
    mintPhaseInfo,
    refreshUserNFTs,
    lastMintedTokenId,
    isUserWL,
    isUserFCFS,
    isUserTeam,
  } = useNFT();

  const canCurrentlyMint = userMintStatus?.canCurrentlyMint;
  const userMints = userMintStatus?.mintsDone || 0;
  const maxMintsPerAddress = userMintStatus?.mintsAllowed || 1;
  const userStatusInfo = userMintStatus?.userStatus || "";
  const isWhitelisted =
    userStatusInfo.includes("WHITELIST") || userStatusInfo.includes("OG");
  const whitelistOnly =
    mintPhaseInfo?.currentPhase === "WHITELIST" ||
    mintPhaseInfo?.currentPhase === "OG_SALE";

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: 10143 });
    } catch (error) {
      console.error("Network switching error:", error);
    }
  };

  const handleMint = async () => {
    try {
      setMintingStep("preparing");

      if (chainId !== 10143) {
        await handleSwitchNetwork();
        return;
      }

      const result = await mint(false);
      setMintingStep("confirming");

      if (result && result.success) {
        setMintingStep("success");

        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }

        successTimeoutRef.current = setTimeout(() => {
          setMintingStep("idle");
          successTimeoutRef.current = null;
        }, 3000);

        setTimeout(() => {
          if (lastMintedTokenId) {
            setLastMintedNFT({
              id: String(lastMintedTokenId),
              image: "/placeholder-nft.png",
            });
          } else {
            checkForNFTMetadata();
          }

          if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = null;
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Mint error:", error);
    }
  };

  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 2;

  const checkForNFTMetadata = async () => {
    if (attempts >= MAX_ATTEMPTS) {
      if (lastMintedTokenId) {
        setLastMintedNFT({
          id: String(lastMintedTokenId),
          image: "/placeholder-nft.png",
        });
      } else if (totalMinted) {
        const tokenId = Number(totalMinted) - 1;
        setLastMintedNFT({
          id: String(tokenId),
          image: "/placeholder-nft.png",
        });
      }
      return;
    }

    setAttempts((prev) => prev + 1);

    try {
      await refreshUserNFTs();

      if (lastMintedTokenId) {
        setLastMintedNFT({
          id: String(lastMintedTokenId),
          image: "/placeholder-nft.png",
        });
        return;
      }

      if (totalMinted) {
        const tokenId = Number(totalMinted) - 1;
        setLastMintedNFT({
          id: String(tokenId),
          image: "/placeholder-nft.png",
        });
      } else {
        setLastMintedNFT({
          id: "?",
          image: "/placeholder-nft.png",
        });
      }
    } catch (error) {
      console.error("Error checking NFT metadata:", error);
      setLastMintedNFT({
        id: lastMintedTokenId ? String(lastMintedTokenId) : "?",
        image: "/placeholder-nft.png",
      });
    }
  };

  useEffect(() => {
    if (isMintSuccess) {
      setMintingStep("success");

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }

      successTimeoutRef.current = setTimeout(() => {
        setMintingStep("idle");
        successTimeoutRef.current = null;
      }, 3000);
    }
  }, [isMintSuccess]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const isSoldOut = totalMinted >= maxSupply;
  const userCanMint =
    canCurrentlyMint && !isPaused && (!whitelistOnly || isWhitelisted);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("hasSeenCollectionInfoPopup");
    if (hasSeenPopup) {
    }
  }, []);

  return (
    <>
      <main className="min-h-screen w-screen text-white flex flex-col sm:pt-0 transition-all duration-1000 ease-in-out bg-[url('/background.png')] bg-cover bg-center bg-no-repeat">
        {/* <img
          src="/buble.png"
          alt="Spikynads Chad logo"
          className="h-full w-full absolute top-0 left-0"
        /> */}
        <div className="max-w-[1100px] w-[90%] mx-auto mt-[40px] lg:mt-[40px] flex lg:flex-row flex-col items-center lg:justify-center">
          <div className="max-w-[1100px] w-full flex flex-col lg:items-start items-center text-white font-medium text-xl lg:mt-0 mt-10">
            <img
              src="/logo.png"
              alt="Spikynads Chad logo"
              className="h-[200px] sm:h-[350px] mx-auto"
            />

            <div className="w-full relativ flex sm:flex-row flex-col  mt-5 sm:mt-10">
              <img
                src="/steve.png"
                alt="Steve character"
                className="h-[200px] sm:h-[350px] lg:h-[450px] w-fit lg:block hidden "
              />

              <div className="w-full flex flex-col items-center justify-center m">
                {address && isWrongNetwork ? (
                  <button
                    className="bg-[#858585] w-full sm:w-[80%] justify-center mx-auto flex items-center rounded h-[60px] sm:h-[85px] py-5 text-4xl uppercase text-white transition-all duration-300 ease-in-out mt-3"
                    onClick={handleSwitchNetwork}
                  >
                    Switch Network
                  </button>
                ) : null}

                {!address && (
                  <WalletModal open={open} setOpen={setOpen}>
                    <button
                      onClick={() => setOpen(true)}
                      className="bg-[#836EF9] w-full sm:w-[80%] justify-center mx-auto flex items-center rounded h-[60px] sm:h-[85px] py-5 text-4xl uppercase text-white transition-all duration-300 ease-in-out mt-3"
                    >
                      Connect Wallet
                    </button>
                  </WalletModal>
                )}

                {address && !isWrongNetwork && (
                  <div className="flex items-center flex-col lg:flex-row gap-3 mt-3 w-full mb-0 uppercase">
                    {isSoldOut ? (
                      <button className="bg-[#858585] w-full sm:w-[80%] justify-center mx-auto flex items-center rounded h-[60px] sm:h-[85px] py-5 text-4xl uppercase text-white transition-all duration-300 ease-in-out mt-3">
                        Sold out!
                      </button>
                    ) : userCanMint ? (
                      <div className="flex items-center gap-5 w-full justify-center">
                        <button
                          className={`
                        ${
                          mintingStep === "idle" ||
                          mintingStep === "preparing" ||
                          mintingStep === "confirming"
                            ? "bg-[#836EF9] hover:bg-opacity-80"
                            : mintingStep === "success"
                            ? "bg-[#836EF9]"
                            : "bg-[#858585] cursor-not-allowed"
                        } 
                         w-full sm:w-[80%] justify-center mx-auto flex items-center rounded h-[60px] sm:h-[85px] py-5 text-4xl uppercase text-white transition-all duration-300 ease-in-out mt-3
                     
                      `}
                          onClick={handleMint}
                          disabled={
                            mintingStep !== "idle" && mintingStep !== "error"
                          }
                        >
                          {mintingStep === "preparing" && (
                            <div className="flex items-center gap-2">
                              Preparing...
                            </div>
                          )}
                          {mintingStep === "confirming" && (
                            <div className="flex items-center gap-2">
                              Confirmation...
                            </div>
                          )}
                          {mintingStep === "success" && (
                            <div className="flex items-center gap-2">
                              Success
                            </div>
                          )}
                          {mintingStep === "idle" && (
                            <>
                              <div className="font-medium w-full">MINT</div>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button className="bg-[#858585] w-full sm:w-[80%] justify-center mx-auto flex items-center rounded h-[60px] sm:h-[85px] py-5 text-4xl uppercase text-white transition-all duration-300 ease-in-out mt-3">
                        MINTED
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-5 p-4 w-full sm:w-[80%] bg-black/40 rounded-md">
                  <div className="flex justify-between items-center mb-3">
                    <div
                      className={`pb-1 rounded-full flex items-center text-lg sm:text-2xl`}
                    >
                      <div
                        className={`${
                          isUserWL || isUserFCFS || isUserTeam
                            ? "bg-green-600"
                            : "bg-red-600"
                        } h-4 w-4 mr-3 `}
                      />

                      {isDisconnected
                        ? "NOT CONNECTED"
                        : isUserTeam
                        ? "ELIGIBLE TEAM"
                        : isUserWL
                        ? "ELIGIBLE WL"
                        : isUserFCFS
                        ? "ELIGIBLE FCFS"
                        : "NOT ELIGIBLE"}
                    </div>
                    {address && (
                      <div className="text-center">
                        <span className="text-lg sm:text-2xl text-gray-300 uppercase">
                          mints:
                        </span>
                        <span className="ml-2 text-lg sm:text-2xl text-white font-medium">
                          {userMints}/{maxMintsPerAddress}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div
                      className="w-full h-5 rounded overflow-hidden"
                      style={{
                        boxShadow: "0px 0px 13px 5px rgba(255, 255, 255, 0.05)",
                        background: "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <div
                        className="h-full bg-[#21a325] transition-all duration-500"
                        style={{
                          width: `${
                            (totalMinted / (maxSupply || 1000)) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg sm:text-2xl text-gray-200 uppercase">
                        Total minted
                      </span>
                      <span className="text-lg sm:text-2xl font-medium text-white">
                        {totalMinted || 0} / {maxSupply || 377}
                      </span>
                    </div>
                    <div className="h-0.5 w-full bg-[#62626238] my-4" />
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium text-xl sm:text-3xl mx-auto mb-2 uppercase">
                        Current phase:{" "}
                        <span className="text-yellow-500">
                          {mintPhaseInfo?.currentPhase ===
                          "First Come First Served"
                            ? "FCFS"
                            : mintPhaseInfo?.currentPhase === "Team Only"
                            ? "TEAM"
                            : mintPhaseInfo?.currentPhase === "Whitelist"
                            ? "WHITELIST"
                            : "ENDED"}
                        </span>
                      </p>
                      {/* <p className="text-white font-bold text-lg sm:text-[22px] uppercase">
                    {!isSoldOut && (
                      <CountdownTimer
                        currentPhase={mintPhaseInfo?.currentPhase}
                      />
                    )}
                  </p> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-[90%] max-w-[1100px] sm:mt-0 mt-5 mx-auto mb-[100px]">
          <UserNFTs />
        </div>
        <img
          src="/thanks.png"
          alt="Papayou link"
          className="max-w-[700px] mx-auto w-full mb-[120px]"
        />
      </main>
    </>
  );
}
