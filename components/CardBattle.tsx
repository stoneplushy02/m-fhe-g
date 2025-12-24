'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useSwitchChain, useChainId } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ethers } from 'ethers'
import { walletClientToSigner, getSigner, getReadOnlyProvider } from '@/lib/provider'
import { sepolia } from 'wagmi/chains'
import { CHARACTERS, type Character } from '@/lib/characters'

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000').trim()

const CONTRACT_ABI = [
  'function mintCharacter(string memory _name, string memory _ability, bytes32 _encryptedStrength, bytes32 _encryptedIntelligence, bytes32 _encryptedAgility) external returns (uint256)',
  'function createDeck(string memory _name, uint256[] memory _characterIds) external returns (uint256)',
  'function createBattle(address _opponent, uint256 _myDeckId, bytes32 _encryptedStats) external returns (uint256)',
  'function acceptBattle(uint256 _battleId, uint256 _myDeckId, bytes32 _encryptedStats) external',
  'function resolveBattle(uint256 _battleId, address _winner) external',
  'function getCharacter(uint256 _characterId) external view returns (uint256 id, string memory name, string memory ability)',
  'function getDeck(uint256 _deckId) external view returns (address owner, string memory name, uint256[] memory characterIds, bool isActive)',
  'function getBattle(uint256 _battleId) external view returns (address player1, address player2, uint256 deck1Id, uint256 deck2Id, uint8 status, address winner)',
  'function getUserCharacters(address _user) external view returns (uint256[])',
  'function getUserDecks(address _user) external view returns (uint256[])',
  'function getUserBattles(address _user) external view returns (uint256[])',
  'event CharacterMinted(address indexed owner, uint256 characterId, string name)',
  'event DeckCreated(address indexed owner, uint256 deckId, string name)',
  'event BattleCreated(uint256 indexed battleId, address indexed player1, address indexed player2)',
  'event BattleCompleted(uint256 indexed battleId, address indexed winner)',
]

type Tab = 'COLLECTION' | 'DECK' | 'BATTLES'

interface MyCharacter {
  id: number
  name: string
  ability: string
  strength: number
  intelligence: number
  agility: number
}

interface Deck {
  id: number
  name: string
  characterIds: number[]
  isActive: boolean
}

interface Battle {
  id: number
  player1: string
  player2: string
  deck1Id: number
  deck2Id: number
  status: number
  winner: string
}

export default function CardBattle() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()
  const chainId = useChainId()

  const [activeTab, setActiveTab] = useState<Tab>('COLLECTION')
  const [myCharacters, setMyCharacters] = useState<MyCharacter[]>([])
  const [myDecks, setMyDecks] = useState<Deck[]>([])
  const [myBattles, setMyBattles] = useState<Battle[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [newDeckName, setNewDeckName] = useState('')
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([])
  const [battleOpponent, setBattleOpponent] = useState('')
  const [selectedDeckForBattle, setSelectedDeckForBattle] = useState<number | null>(null)
  const [isSelectingForDeck, setIsSelectingForDeck] = useState(false)

  useEffect(() => {
    if (isConnected && chainId !== sepolia.id) {
      switchChain({ chainId: sepolia.id })
    }
  }, [isConnected, chainId, switchChain])

  useEffect(() => {
    if (isConnected && address && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      loadMyCharacters()
      loadMyDecks()
      loadMyBattles()
    }
  }, [isConnected, address])

  const getEthersSigner = async () => {
    if (walletClient) {
      return await walletClientToSigner(walletClient)
    }
    return await getSigner()
  }

  const loadMyCharacters = async () => {
    if (!address) return

    try {
      const provider = getReadOnlyProvider()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      
      const characterIds = await contract.getUserCharacters(address)
      
      const characterPromises = characterIds.map(async (id: bigint) => {
        const char = CHARACTERS[Number(id)]
        if (char) {
          return char
        }
        const contractData = await contract.getCharacter(id)
        return {
          id: Number(id),
          name: contractData[1],
          ability: contractData[2],
          strength: 50,
          intelligence: 50,
          agility: 50
        }
      })

      const loaded = await Promise.all(characterPromises)
      setMyCharacters(loaded)
    } catch (error) {
      console.error('Failed to load characters:', error)
    }
  }

  const loadMyDecks = async () => {
    if (!address) return

    try {
      const provider = getReadOnlyProvider()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      
      const deckIds = await contract.getUserDecks(address)
      
      const deckPromises = deckIds.map(async (id: bigint) => {
        const deckData = await contract.getDeck(id)
        return {
          id: Number(id),
          name: deckData[1],
          characterIds: deckData[2].map((c: bigint) => Number(c)),
          isActive: deckData[3]
        }
      })

      const loaded = await Promise.all(deckPromises)
      setMyDecks(loaded)
    } catch (error) {
      console.error('Failed to load decks:', error)
    }
  }

  const loadMyBattles = async () => {
    if (!address) return

    try {
      const provider = getReadOnlyProvider()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      
      const battleIds = await contract.getUserBattles(address)
      
      const battlePromises = battleIds.map(async (id: bigint) => {
        const battleData = await contract.getBattle(id)
        return {
          id: Number(id),
          player1: battleData[0],
          player2: battleData[1],
          deck1Id: Number(battleData[2]),
          deck2Id: Number(battleData[3]),
          status: Number(battleData[4]),
          winner: battleData[5]
        }
      })

      const loaded = await Promise.all(battlePromises)
      setMyBattles(loaded.reverse())
    } catch (error) {
      console.error('Failed to load battles:', error)
    }
  }

  const mintCharacter = async (character: Character) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    setIsLoading(true)
    try {
      const strengthBytes = ethers.toUtf8Bytes(character.strength.toString())
      const strengthHash = ethers.keccak256(strengthBytes)
      const intelligenceBytes = ethers.toUtf8Bytes(character.intelligence.toString())
      const intelligenceHash = ethers.keccak256(intelligenceBytes)
      const agilityBytes = ethers.toUtf8Bytes(character.agility.toString())
      const agilityHash = ethers.keccak256(agilityBytes)

      const signer = await getEthersSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      const tx = await contract.mintCharacter(
        character.name,
        character.ability,
        strengthHash,
        intelligenceHash,
        agilityHash
      )
      await tx.wait()

      await loadMyCharacters()
      alert('Character minted successfully!')
    } catch (error: any) {
      console.error('Failed to mint character:', error)
      alert(`Failed to mint character: ${error.reason || error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const createDeck = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    if (!newDeckName.trim() || selectedCharacters.length === 0) {
      alert('Please enter a deck name and select characters')
      return
    }

    if (selectedCharacters.length > 10) {
      alert('Deck cannot contain more than 10 characters')
      return
    }

    setIsLoading(true)
    try {
      const signer = await getEthersSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      const tx = await contract.createDeck(newDeckName.trim(), selectedCharacters)
      await tx.wait()

      setNewDeckName('')
      setSelectedCharacters([])
      await loadMyDecks()
      alert('Deck created successfully!')
    } catch (error: any) {
      console.error('Failed to create deck:', error)
      alert(`Failed to create deck: ${error.reason || error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const createBattle = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet')
      return
    }

    if (!battleOpponent.trim() || !selectedDeckForBattle) {
      alert('Please enter opponent address and select a deck')
      return
    }

    setIsLoading(true)
    try {
      const statsHash = ethers.keccak256(ethers.toUtf8Bytes('battle-stats'))

      const signer = await getEthersSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      const tx = await contract.createBattle(
        battleOpponent.trim(),
        selectedDeckForBattle,
        statsHash
      )
      await tx.wait()

      setBattleOpponent('')
      setSelectedDeckForBattle(null)
      await loadMyBattles()
      alert('Battle created! Waiting for opponent to accept...')
    } catch (error: any) {
      console.error('Failed to create battle:', error)
      alert(`Failed to create battle: ${error.reason || error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCharacterSelection = (characterId: number) => {
    if (selectedCharacters.includes(characterId)) {
      setSelectedCharacters(selectedCharacters.filter(id => id !== characterId))
    } else {
      if (selectedCharacters.length < 10) {
        setSelectedCharacters([...selectedCharacters, characterId])
      } else {
        alert('Maximum 10 characters per deck')
      }
    }
  }

  const getStatusText = (status: number) => {
    if (status === 0) return 'Pending'
    if (status === 1) return 'Active'
    if (status === 2) return 'Completed'
    return 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Magic FHE Gathering</h1>
          <ConnectButton />
        </div>

        <div className="flex gap-4 mb-8 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('COLLECTION')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'COLLECTION'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            Collection
          </button>
          <button
            onClick={() => setActiveTab('DECK')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'DECK'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            Decks
          </button>
          <button
            onClick={() => setActiveTab('BATTLES')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'BATTLES'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            }`}
          >
            Battles
          </button>
        </div>

        {activeTab === 'COLLECTION' && (
          <div>
            {isSelectingForDeck && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-semibold text-blue-800 mb-2">Selecting characters for deck ({selectedCharacters.length}/10)</p>
                <button
                  onClick={() => {
                    setIsSelectingForDeck(false)
                    setActiveTab('DECK')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Done Selecting - Go to Decks
                </button>
              </div>
            )}
            <h2 className="text-2xl font-bold mb-6">All Characters ({CHARACTERS.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {CHARACTERS.map((character) => {
                const isOwned = myCharacters.some(c => c.id === character.id)
                const isSelected = selectedCharacters.includes(character.id)
                return (
                  <div
                    key={character.id}
                    className={`p-4 border-2 rounded-lg ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    } ${isOwned ? 'bg-green-50' : ''}`}
                  >
                    <h3 className="font-bold text-lg mb-2">{character.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Ability: {character.ability}</p>
                    <div className="text-sm mb-3">
                      <p>STR: {character.strength}</p>
                      <p>INT: {character.intelligence}</p>
                      <p>AGI: {character.agility}</p>
                    </div>
                    {isSelectingForDeck && isOwned && (
                      <button
                        onClick={() => toggleCharacterSelection(character.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
                      >
                        {isSelected ? 'Remove from Deck' : 'Add to Deck'}
                      </button>
                    )}
                    {!isSelectingForDeck && !isOwned && (
                      <button
                        onClick={() => mintCharacter(character)}
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Mint
                      </button>
                    )}
                    {!isSelectingForDeck && isOwned && <p className="text-green-600 text-sm font-semibold">Owned</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'DECK' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">Create New Deck</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-semibold">Deck Name</label>
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="My Awesome Deck"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>
                  <div>
                    <p className="mb-2 font-semibold">Selected Characters ({selectedCharacters.length}/10)</p>
                    {selectedCharacters.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedCharacters.map((charId) => {
                          const char = CHARACTERS[charId]
                          return (
                            <span key={charId} className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                              {char?.name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setIsSelectingForDeck(true)
                        setActiveTab('COLLECTION')
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Select Characters from Collection
                    </button>
                  </div>
                <button
                  onClick={createDeck}
                  disabled={isLoading || !newDeckName.trim() || selectedCharacters.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Deck
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">My Decks ({myDecks.length})</h2>
              {myDecks.length === 0 ? (
                <p className="text-gray-500">You haven't created any decks yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myDecks.map((deck) => (
                    <div key={deck.id} className="bg-white p-4 rounded-lg shadow">
                      <h3 className="font-bold text-lg mb-2">{deck.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {deck.characterIds.length} characters
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {deck.characterIds.map((charId) => {
                          const char = CHARACTERS[charId]
                          return (
                            <span key={charId} className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {char?.name || `#${charId}`}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'BATTLES' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">Create Battle</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-semibold">Opponent Address</label>
                  <input
                    type="text"
                    value={battleOpponent}
                    onChange={(e) => setBattleOpponent(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-semibold">Select Deck</label>
                  <select
                    value={selectedDeckForBattle || ''}
                    onChange={(e) => setSelectedDeckForBattle(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select a deck...</option>
                    {myDecks.filter(d => d.isActive).map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name} ({deck.characterIds.length} chars)
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createBattle}
                  disabled={isLoading || !battleOpponent.trim() || !selectedDeckForBattle}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Battle
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">My Battles ({myBattles.length})</h2>
              {myBattles.length === 0 ? (
                <p className="text-gray-500">No battles yet</p>
              ) : (
                <div className="space-y-4">
                  {myBattles.map((battle) => (
                    <div key={battle.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">
                            {battle.player1.slice(0, 6)}...{battle.player1.slice(-4)} vs{' '}
                            {battle.player2.slice(0, 6)}...{battle.player2.slice(-4)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Status: {getStatusText(battle.status)}
                          </p>
                          {battle.winner !== '0x0000000000000000000000000000000000000000' && (
                            <p className="text-sm text-green-600 mt-1">
                              Winner: {battle.winner.slice(0, 6)}...{battle.winner.slice(-4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

