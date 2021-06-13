import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import App from "./App";
import Video from "./Video";
import "antd/dist/antd.css";

const AppRouter = () => (
  <Router>
    <Switch>
      <Route exact path="/">
        <App />
      </Route>
      <Route path="/call/:meetId" render={(props) => <Video {...props} />} />
    </Switch>
  </Router>
);

export default AppRouter;
