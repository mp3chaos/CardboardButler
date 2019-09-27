import * as React from "react";
import BggGameService from "../services/BggGameService";
import { GameInfoPlus } from "../models/GameInfo";
import { CollectionMerger } from "../services/CollectionMerger";
import WelcomePage from "./WelcomePage";
import CollectionPage from "./CollectionPage";
import BggGameLoader, { LoadingInfo } from "../services/BggGameLoader";
import { Dimmer, Loader } from "semantic-ui-react";

export interface AppProps {
    bggServce?: BggGameService;
}


export interface AppState {
    names: string[];
    games: GameInfoPlus[];
    loadingInfo: LoadingInfo[];
    showingCollection: boolean;
}

const initialState: AppState = { names: [], games: [], loadingInfo: [], showingCollection: false };


export default class App extends React.Component<AppProps, AppState> {

    private collectionMerger: CollectionMerger;
    private readonly loader: BggGameLoader;

    constructor(superProps: Readonly<AppProps>) {
        super(superProps);
        this.collectionMerger = new CollectionMerger();

        this.onNameSelect = this.onNameSelect.bind(this);
        this.userValidator = this.userValidator.bind(this);
        this.handleHashChange = this.handleHashChange.bind(this);
        const bggService = superProps.bggServce || new BggGameService();
        this.loader = new BggGameLoader(bggService, this.collectionMerger, true);
        this.loader.onGamesUpdate((games) => {
            if (this._ismounted) {
                this.setState({ games: games, showingCollection: true });
            }
        });
        this.loader.onLoadUpdate((loadinfo) => {
            if (this._ismounted) {
                this.setState({ loadingInfo: loadinfo });
            }
        });
        this.state = initialState;
        window.addEventListener("hashchange", this.handleHashChange, false);
    }

    private _ismounted: boolean;


    componentDidMount() {
        this._ismounted = true;
        this.handleHashChange();
    }

    handleHashChange() {
        const hashValue = window.location.hash.substr(0);
        if (hashValue && hashValue !== "" && hashValue.indexOf("usernames=") > -1) {
            const usernames = hashValue.substring("usernames=".length + 1).split(",");
            this.onNameSelect(usernames);
        } else {
            this.setState(initialState);
        }
    }

    componentWillUnmount() {
        window.removeEventListener("hashchange", this.handleHashChange, false);
        this._ismounted = false;
    }

    getBggService() {
        return this.props.bggServce || new BggGameService();
    }


    onNameSelect(newNames: string[]) {
        if (newNames.join(",") !== this.state.names.join(",")) {
            this.setState({
                names: newNames
            });
            window.location.hash = "usernames=" + newNames.join(",");
            if (this._ismounted) {
                this.loader.loadCollections(newNames).then(() => {
                    this.loader.loadExtendedInfo();
                });
            }
        }
    }


    async userValidator(name: string) {
        const res = await this.getBggService().getUserInfo(name);
        return res.isValid === true;
    }

    render() {
        const { loadingInfo = [], games, showingCollection } = this.state;
        const loadingCollections = loadingInfo.filter((li) => li.type === "collection").map((c) => c.type === "collection" ? c.username : "");
        const isLoadingCollections = loadingCollections.length > 0;
        const loadingGames = loadingInfo.filter((li) => li.type === "game");
        return (
            <span >
                {!showingCollection && !isLoadingCollections && <WelcomePage onNameSelect={this.onNameSelect} userValidator={this.userValidator} />}
                {isLoadingCollections && games.length === 0 && <Dimmer active inverted>
                    <Loader inverted content={"Finding games for " + loadingCollections.join(", ")} />
                </Dimmer>
                }
                {isLoadingCollections && games.length > 0 && <Loader active inline="centered" content={"Finding games for " + loadingCollections.join(", ")} />}
                {loadingGames.length > 0 && games.length > 0 && <Loader active inline="centered" content={"Getting extra info for " + loadingGames.length + " games"} />}
                {games.length > 0 && showingCollection && <CollectionPage currentUsers={this.state.names} games={games} />}

            </span>
        );
    }
}
