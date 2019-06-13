import * as ts from 'typescript';
import { schemas } from './main';

export default function transformer(program: ts.Program, config: any) {
    return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
        console.log(schemas);
        return file;
    }
}

// function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
    // return ts.visitEachChild(
    //     visitNode(node, program),
    //     childNode => visitNodeAndChildren(childNode, program, context),
    //     context
    // );
// }

// function visitNode(node: ts.Node, program: ts.Program): ts.Node {

//     console.log(schemas);
//     return node
// }