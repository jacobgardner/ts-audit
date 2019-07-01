export enum StringEnum {
    Fruit1 = 'apple',
    Fruit2 = 'orange',
}

export enum NumEnum {
    Zero = 0,
    One = 1,
}

export enum Mixed {
    String1 = 'Coke',
    Flag1 = 29,
    String2 = 'Pepsi',
    Flag2 = 24,
    Flag3, // 25 - autoincrement
}

interface NonExportedInterface {
    nonExport1: string;
    nonExport2: number;
}

export interface ShallowInterface {
    shallow1: number;
    shallow2: string;
    optionalShallow?: string;
}

export interface NestedInterface {
    nested1?: NonExportedInterface;
    nested2: ShallowInterface;
}

export interface CircularInterface {
    value: number;
    circle?: CircularInterface;
}

export interface GenericType<T> {
    value: T;
}

export interface ComplexInterface<T> {
    mixed: Mixed[];
    genericType?: GenericType<T>;
    circular: CircularInterface;
    tuple: [number, T];
}

export interface UnionIntersectionInterface {
    union: NonExportedInterface | CircularInterface;
    intersection: NonExportedInterface & ShallowInterface;
}

export type Aliased = NonExportedInterface;
export type UnionType = NonExportedInterface | CircularInterface;
export type IntersectionType = NonExportedInterface & ShallowInterface;
