import React from "react";
import classNames from "classnames";
import styled from "styled-components";

const StyleMiniCssCard = styled.div`
	background: #1f292d;
	padding: 0.5rem;
`;

const Card = ({ header, children, className, ...props }) => (
	<StyleMiniCssCard className={classNames("card fluid", className)}>
		{header}
		{header && <hr />}
		{children}
	</StyleMiniCssCard>
);

export default Card;
