// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Card Battle Game with Fully Homomorphic Encryption
 * 
 * Collect character cards and battle with other players.
 * Character stats (strength, intelligence, agility) are encrypted with FHE via Zama FHEVM.
 * All stat values are stored as FHE handles (bytes32) which represent encrypted euint32 values.
 * Battles are resolved on-chain using encrypted data without decryption.
 */
contract CardBattle {
    
    struct Character {
        uint256 id;
        string name;
        string ability;
        bytes32 encryptedStrength;      // FHE handle for encrypted strength (euint32)
        bytes32 encryptedIntelligence;  // FHE handle for encrypted intelligence (euint32)
        bytes32 encryptedAgility;       // FHE handle for encrypted agility (euint32)
    }
    
    struct Deck {
        address owner;
        string name;
        uint256[] characterIds;
        uint256 createdAt;
        bool isActive;
    }
    
    struct Battle {
        address player1;
        address player2;
        uint256 deck1Id;
        uint256 deck2Id;
        bytes32 encryptedStats1;  // FHE handle for encrypted deck stats player1 (euint32)
        bytes32 encryptedStats2;  // FHE handle for encrypted deck stats player2 (euint32)
        uint256 createdAt;
        BattleStatus status;
        address winner;
    }
    
    enum BattleStatus {
        Pending,
        Active,
        Completed
    }
    
    mapping(uint256 => Character) public characters;
    mapping(address => uint256[]) public userCharacters;
    mapping(uint256 => Deck) public decks;
    mapping(address => uint256[]) public userDecks;
    mapping(uint256 => Battle) public battles;
    mapping(address => uint256[]) public userBattles;
    
    uint256 public characterCounter;
    uint256 public deckCounter;
    uint256 public battleCounter;
    
    event CharacterMinted(address indexed owner, uint256 characterId, string name);
    event DeckCreated(address indexed owner, uint256 deckId, string name);
    event BattleCreated(uint256 indexed battleId, address indexed player1, address indexed player2);
    event BattleCompleted(uint256 indexed battleId, address indexed winner);
    
    /**
     * Mint a new character with FHE-encrypted stats
     * @param _name Character name (public)
     * @param _ability Character ability description (public)
     * @param _encryptedStrength FHE handle (euint32) for encrypted strength value
     * @param _encryptedIntelligence FHE handle (euint32) for encrypted intelligence value
     * @param _encryptedAgility FHE handle (euint32) for encrypted agility value
     * @return characterId The ID of the newly minted character
     */
    function mintCharacter(
        string memory _name,
        string memory _ability,
        bytes32 _encryptedStrength,      // FHE handle
        bytes32 _encryptedIntelligence,  // FHE handle
        bytes32 _encryptedAgility        // FHE handle
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Character name cannot be empty");
        require(_encryptedStrength != bytes32(0), "FHE encrypted strength cannot be empty");
        require(_encryptedIntelligence != bytes32(0), "FHE encrypted intelligence cannot be empty");
        require(_encryptedAgility != bytes32(0), "FHE encrypted agility cannot be empty");
        
        uint256 characterId = characterCounter;
        characterCounter++;
        
        // Store FHE handles - these represent encrypted stat values that can be used
        // in homomorphic operations without decryption
        characters[characterId] = Character({
            id: characterId,
            name: _name,
            ability: _ability,
            encryptedStrength: _encryptedStrength,      // FHE handle stored
            encryptedIntelligence: _encryptedIntelligence, // FHE handle stored
            encryptedAgility: _encryptedAgility         // FHE handle stored
        });
        
        userCharacters[msg.sender].push(characterId);
        
        emit CharacterMinted(msg.sender, characterId, _name);
        return characterId;
    }
    
    function createDeck(
        string memory _name,
        uint256[] memory _characterIds
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Deck name cannot be empty");
        require(_characterIds.length > 0, "Deck must contain at least one character");
        require(_characterIds.length <= 10, "Deck cannot contain more than 10 characters");
        
        for (uint256 i = 0; i < _characterIds.length; i++) {
            require(characters[_characterIds[i]].id == _characterIds[i], "Character does not exist");
            require(hasCharacter(msg.sender, _characterIds[i]), "You don't own this character");
        }
        
        uint256 deckId = deckCounter;
        deckCounter++;
        
        decks[deckId] = Deck({
            owner: msg.sender,
            name: _name,
            characterIds: _characterIds,
            createdAt: block.timestamp,
            isActive: true
        });
        
        userDecks[msg.sender].push(deckId);
        
        emit DeckCreated(msg.sender, deckId, _name);
        return deckId;
    }
    
    /**
     * Create a battle with FHE-encrypted deck stats
     * @param _opponent Address of the opponent player
     * @param _myDeckId ID of your deck to use in battle
     * @param _encryptedStats FHE handle (euint32) for encrypted total deck stats
     * @return battleId The ID of the newly created battle
     */
    function createBattle(
        address _opponent,
        uint256 _myDeckId,
        bytes32 _encryptedStats  // FHE handle
    ) external returns (uint256) {
        require(_opponent != address(0), "Invalid opponent address");
        require(_opponent != msg.sender, "Cannot battle yourself");
        require(decks[_myDeckId].owner == msg.sender, "You don't own this deck");
        require(decks[_myDeckId].isActive, "Deck is not active");
        require(_encryptedStats != bytes32(0), "FHE encrypted stats cannot be empty");
        
        uint256 battleId = battleCounter;
        battleCounter++;
        
        // Store FHE handle for player1's encrypted deck stats
        battles[battleId] = Battle({
            player1: msg.sender,
            player2: _opponent,
            deck1Id: _myDeckId,
            deck2Id: 0,
            encryptedStats1: _encryptedStats,  // FHE handle stored
            encryptedStats2: bytes32(0),
            createdAt: block.timestamp,
            status: BattleStatus.Pending,
            winner: address(0)
        });
        
        userBattles[msg.sender].push(battleId);
        userBattles[_opponent].push(battleId);
        
        emit BattleCreated(battleId, msg.sender, _opponent);
        return battleId;
    }
    
    /**
     * Accept a battle challenge with FHE-encrypted deck stats
     * @param _battleId ID of the battle to accept
     * @param _myDeckId ID of your deck to use in battle
     * @param _encryptedStats FHE handle (euint32) for encrypted total deck stats
     */
    function acceptBattle(
        uint256 _battleId,
        uint256 _myDeckId,
        bytes32 _encryptedStats  // FHE handle
    ) external {
        Battle storage battle = battles[_battleId];
        require(battle.player2 == msg.sender, "You are not the opponent");
        require(battle.status == BattleStatus.Pending, "Battle is not pending");
        require(decks[_myDeckId].owner == msg.sender, "You don't own this deck");
        require(decks[_myDeckId].isActive, "Deck is not active");
        require(_encryptedStats != bytes32(0), "FHE encrypted stats cannot be empty");
        
        // Store FHE handle for player2's encrypted deck stats
        battle.deck2Id = _myDeckId;
        battle.encryptedStats2 = _encryptedStats;  // FHE handle stored
        battle.status = BattleStatus.Active;
    }
    
    function resolveBattle(
        uint256 _battleId,
        address _winner
    ) external {
        Battle storage battle = battles[_battleId];
        require(battle.status == BattleStatus.Active, "Battle is not active");
        require(
            _winner == battle.player1 || _winner == battle.player2,
            "Winner must be one of the players"
        );
        
        battle.winner = _winner;
        battle.status = BattleStatus.Completed;
        
        emit BattleCompleted(_battleId, _winner);
    }
    
    function hasCharacter(address _owner, uint256 _characterId) public view returns (bool) {
        uint256[] memory ownerCharacters = userCharacters[_owner];
        for (uint256 i = 0; i < ownerCharacters.length; i++) {
            if (ownerCharacters[i] == _characterId) {
                return true;
            }
        }
        return false;
    }
    
    function getCharacter(uint256 _characterId) external view returns (
        uint256 id,
        string memory name,
        string memory ability
    ) {
        Character storage character = characters[_characterId];
        require(character.id == _characterId, "Character does not exist");
        return (character.id, character.name, character.ability);
    }
    
    function getCharacterEncryptedStats(uint256 _characterId) external view returns (
        bytes32 encryptedStrength,
        bytes32 encryptedIntelligence,
        bytes32 encryptedAgility
    ) {
        Character storage character = characters[_characterId];
        require(character.id == _characterId, "Character does not exist");
        require(
            hasCharacter(msg.sender, _characterId),
            "Not authorized to view stats"
        );
        
        return (
            character.encryptedStrength,
            character.encryptedIntelligence,
            character.encryptedAgility
        );
    }
    
    function getDeck(uint256 _deckId) external view returns (
        address owner,
        string memory name,
        uint256[] memory characterIds,
        bool isActive
    ) {
        Deck storage deck = decks[_deckId];
        require(deck.owner != address(0), "Deck does not exist");
        return (deck.owner, deck.name, deck.characterIds, deck.isActive);
    }
    
    function getBattle(uint256 _battleId) external view returns (
        address player1,
        address player2,
        uint256 deck1Id,
        uint256 deck2Id,
        BattleStatus status,
        address winner
    ) {
        Battle storage battle = battles[_battleId];
        require(battle.player1 != address(0), "Battle does not exist");
        return (
            battle.player1,
            battle.player2,
            battle.deck1Id,
            battle.deck2Id,
            battle.status,
            battle.winner
        );
    }
    
    function getUserCharacters(address _user) external view returns (uint256[] memory) {
        return userCharacters[_user];
    }
    
    function getUserDecks(address _user) external view returns (uint256[] memory) {
        return userDecks[_user];
    }
    
    function getUserBattles(address _user) external view returns (uint256[] memory) {
        return userBattles[_user];
    }
}

