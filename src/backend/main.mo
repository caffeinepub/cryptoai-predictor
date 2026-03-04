import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type Coin = {
    symbol    : Text;
    name      : Text;
    price     : Float;
    change24h : Float;
    volume24h : Float;
    marketCap : Float;
    updatedAt : Int;
  };

  type Recommendation = { #buy; #sell; #hold };

  type AISignal = {
    coinSymbol     : Text;
    recommendation : Recommendation;
    confidence     : Nat;
    reasoning      : Text;
    timestamp      : Int;
  };

  public type UserProfile = {
    username   : Text;
    phone      : Text;
    country    : Text;
    demoBalance : Nat;
    hasCompletedOnboarding : Bool;
  };

  let coins = Map.empty<Text, Coin>();
  let signals = Map.empty<Text, AISignal>();
  let watchlists = Map.empty<Principal, [Text]>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var initialized : Bool = false;

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user: Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can access all profiles");
    };
    userProfiles.values().toArray();
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func floatToText(f : Float) : Text {
    (Float.nearest(f * 100.0) / 100.0).toText()
  };

  func computeSignal(c : Coin) : AISignal {
    let now = Time.now();
    let change = c.change24h;
    let rec : Recommendation = if (change > 3.0) { #buy }
      else if (change < -3.0) { #sell }
      else { #hold };
    let conf : Nat = if (change > 5.0) { 90 }
      else if (change > 3.0) { 78 }
      else if (change < -5.0) { 85 }
      else if (change < -3.0) { 72 }
      else { 65 };
    let reason : Text = if (change > 3.0) {
        "Strong upward momentum of " # floatToText(change) # "%. Bullish signal confirmed."
      } else if (change < -3.0) {
        "Bearish pressure detected: " # floatToText(change) # "%. Consider reducing exposure."
      } else {
        "Consolidation phase near " # floatToText(c.price) # ". Hold and monitor."
      };
    { coinSymbol = c.symbol; recommendation = rec; confidence = conf; reasoning = reason; timestamp = now }
  };

  func ensureInit() {
    if (initialized) return;
    initialized := true;
    let now = Time.now();
    let seedData : [(Text, Text, Float, Float, Float, Float)] = [
      ("BTC",  "Bitcoin",         67432.50,  2.34,    28400000000.0,  1328000000000.0),
      ("ETH",  "Ethereum",         3512.80, -1.12,    14200000000.0,   422000000000.0),
      ("BNB",  "BNB",               598.40,  4.71,     1800000000.0,    87000000000.0),
      ("SOL",  "Solana",            178.90,  5.23,     3100000000.0,    79000000000.0),
      ("XRP",  "XRP",                 0.62, -2.45,     2900000000.0,    33000000000.0),
      ("ADA",  "Cardano",             0.47,  1.88,      450000000.0,    16600000000.0),
      ("DOGE", "Dogecoin",            0.165,-3.80,      920000000.0,    24000000000.0),
      ("AVAX", "Avalanche",           37.80,  6.14,      680000000.0,   15600000000.0),
      ("MATIC","Polygon",              0.88, -0.55,      520000000.0,    8100000000.0),
      ("DOT",  "Polkadot",             8.72,  3.15,      310000000.0,   11200000000.0),
      ("LINK", "Chainlink",           17.50,  2.88,      490000000.0,   10300000000.0),
      ("LTC",  "Litecoin",            85.20, -1.60,      580000000.0,    6300000000.0),
      ("UNI",  "Uniswap",             10.40,  0.92,      180000000.0,    6200000000.0),
      ("ATOM", "Cosmos",               8.95,  4.50,      270000000.0,    3500000000.0),
      ("NEAR", "NEAR Protocol",        6.78, -4.22,      330000000.0,    7400000000.0),
    ];
    for ((sym, name, price, change, vol, cap) in seedData.vals()) {
      let coin : Coin = { symbol = sym; name; price; change24h = change; volume24h = vol; marketCap = cap; updatedAt = now };
      coins.add(sym, coin);
      signals.add(sym, computeSignal(coin));
    };
  };

  public query func getCoinList() : async [Coin] {
    ensureInit();
    coins.entries().map(func((_, v) : (Text, Coin)) : Coin = v).toArray()
  };

  public query func getCoinDetail(symbol : Text) : async ?Coin {
    ensureInit();
    coins.get(symbol)
  };

  public query func getAISignals() : async [AISignal] {
    ensureInit();
    signals.entries().map(func((_, v) : (Text, AISignal)) : AISignal = v).toArray()
  };

  public query func getAISignalForCoin(symbol : Text) : async ?AISignal {
    ensureInit();
    signals.get(symbol)
  };

  public query ({ caller }) func getUserWatchlist() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access watchlists");
    };
    ensureInit();
    switch (watchlists.get(caller)) {
      case (?wl) { wl };
      case (null) { [] };
    }
  };

  public shared ({ caller }) func addToWatchlist(symbol : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify watchlists");
    };
    ensureInit();
    let current = switch (watchlists.get(caller)) {
      case (?wl) { wl };
      case (null) { [] };
    };
    if (current.indexOf(symbol) == null) {
      watchlists.add(caller, current.concat([symbol]));
    };
  };

  public shared ({ caller }) func removeFromWatchlist(symbol : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify watchlists");
    };
    ensureInit();
    let current = switch (watchlists.get(caller)) {
      case (?wl) { wl };
      case (null) { [] };
    };
    watchlists.add(caller, current.filter(func(s : Text) : Bool = s != symbol));
  };
};
