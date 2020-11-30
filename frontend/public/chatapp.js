'use strict';

const e = React.createElement;

class ChatApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = { user: false };
    }

    render() {
        if (this.state.user)
            return (
                <h1>You're Logged In</h1>
            );

        return (
            <h1>You're Not Logged In</h1>
        );
    }
}

const domContainer = document.querySelector('#chatapp');
ReactDOM.render(e(ChatApp), domContainer);