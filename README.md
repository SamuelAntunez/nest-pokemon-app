# Indice

- [Global Prefix](#global-prefix)
- [ValidationPipe Global](#validationpipe-global)
- [Archivos Estaticos](#archivos-estaticos)
- [MongoDB](#mongodb)
  - [docker-compose.yaml](#docker-composeyaml)
  - [Conectar mongo con nest](#conectar-mongo-con-nest)
  - [Inyectar modelos](#inyectar-modelos)
  - [AppModule completo](#appmodule-completo)
  - [Metodos de Mongoose](#metodos-de-mongoose-usados-en-el-proyecto)
    - [create()](#create---crear-un-registro)
    - [find()](#find---obtener-multiples-registros)
    - [findOne()](#findone---buscar-un-solo-registro)
    - [findById()](#findbyid---buscar-por-objectid)
    - [updateOne()](#updateone---actualizar-documento)
    - [deleteOne()](#deleteone---eliminar-un-documento)
    - [deleteMany()](#deletemany---eliminar-todos-los-documentos)
    - [insertMany()](#insertmany---insercion-masiva)
    - [isValidObjectId()](#isvalidobjectid---validar-mongoid)
    - [Error code 11000](#error-code-11000---duplicados)
    - [Campos de mongoose](#campos-automaticos-de-mongoose-_id-y-__v)
    - [Metodos de instancia vs estaticos](#metodos-de-instancia-vs-estaticos)
- [Entidad / Schema](#entidad--schema)
- [PokemonModule - forFeature](#pokemonmodule---forfeature)
- [DTOs - Data Transfer Objects](#dtos---data-transfer-objects)
  - [CreatePokemonDto](#createpokemondto)
  - [UpdatePokemonDto - PartialType](#updatepokemondto---partialtype)
  - [PaginationDto](#paginationdto)
- [Pokemon Service - CRUD](#pokemon-service---crud)
- [Pokemon Controller - Rutas](#pokemon-controller---rutas)
- [ParseMongoIdPipe - Pipe personalizado](#parsemongoidpipe---pipe-personalizado)
- [CommonModule - Modulo Compartido](#commonmodule---modulo-compartido)
- [HttpAdapter Interface](#httpadapter-interface)
- [AxiosAdapter - Implementacion del Adaptador](#axiosadapter---implementacion-del-adaptador)
- [Seed - Poblacion de Datos](#seed---poblacion-de-datos)
  - [SeedModule](#seedmodule)
  - [SeedService](#seedservice)
  - [SeedController](#seedcontroller)
  - [PokeResponse Interface](#poker esponse-interface)

---

# Global Prefix

* `app.setGlobalPrefix`: Sirve para colocarle rutas que se van a usar antes de la api

```ts
async function main() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v2')
  await app.listen(process.env.PORT ?? 3000);
}
main();
```

# ValidationPipe Global

Se colocan validadores globales para que en todo momento al usar los DTOs se validen. Al tener `transform: true` se transforma automaticamente al tipo de dato especificado en el DTO.

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  })
)
```

* `whitelist`: Elimina las propiedades que no esten definidas en el DTO
* `forbidNonWhitelisted`: Lanza un error si se envian propiedades que no estan en el DTO
* `transform`: Transforma automaticamente los tipos de datos (strings a numbers, etc.)
* `enableImplicitConversion`: Permite que los decoradores `@Query()` y `@Param()` conviertan tipos implicitamente

# Archivos Estaticos

NestJS permite servir archivos estaticos como si fuera un frontend basico con `@nestjs/serve-static`

```
$ npm i @nestjs/serve-static
```

```ts
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public')
    }),
  ]
})
export class AppModule {}
```

* `ServeStaticModule.forRoot()`: Recibe la ruta de la carpeta publica
* `join(__dirname, '..', 'public')`: `__dirname` apunta a `dist/`, entonces subimos un nivel y entramos a `public/`

# MongoDB

## docker-compose.yaml

Se crea el archivo .yaml para crear el entorno en el que estara nuestra base de datos mongo

```yaml
version: '3'
services:
  db:
    image: mongo:5
    restart: always
    ports:
      - 27017:27017
    environment:
      MONGODB_DATABASE: nest-pokemon
    volumes:
      - ./mongo:/data/db
```

## Conectar mongo con nest

Nest ya viene con un wrapper de mongoose que nos ayudara a trabajar mas facil

`$ npm i @nestjs/mongoose mongoose`

Y en el `app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost:27017/nest-pokemon')],
})
export class AppModule {}
```

## Inyectar modelos

```ts
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>
  ){}
```

* `@InjectModel()`: viene de `@nestjs/mongoose` y sirve para especificar que estamos inyectando un modelo, se pasa como argumento el nombre de la entidad.name
* `Model<Entity>`: Viene de mongoose y es lo que inyectaremos

## AppModule completo

```ts
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PokemonModule } from './pokemon/pokemon.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),
    MongooseModule.forRoot('mongodb://localhost:27017/nest-pokemon'),
    PokemonModule,
    CommonModule,
    SeedModule
  ],
})
export class AppModule {}
```

## Metodos de Mongoose usados en el proyecto

### `create()` - Crear un registro

Inserta un nuevo documento en la coleccion usando el modelo.

```ts
const pokemon = await this.pokemonModel.create(createPokemonDto)
```

* Retorna el documento creado con su `_id` generado automaticamente por mongo
* Si hay un campo con `unique: true` y ya existe un documento con ese valor, mongo lanza un error con codigo `11000`
* Es un metodo **estatico** del modelo (se llama sobre `this.pokemonModel.create()`, no sobre una instancia)

---

### `find()` - Obtener multiples registros con filtros

```ts
this.pokemonModel.find()
  .limit(limit)
  .skip(offset)
  .sort({ no: 1 })
  .select(['-__v'])
```

* `find()` sin argumentos retorna **todos** los documentos de la coleccion
* `.limit(n)`: Limita la cantidad de resultados a `n`
* `.skip(n)`: Salta los primeros `n` registros (para paginacion con offset)
* `.sort({ campo: 1 })`: Ordena los resultados. `1` = ascendente, `-1` = descendente
* `.select(['-campo'])`: Excluye el campo especificado del resultado. `'-__v'` excluye el campo de version de mongoose
* Estos metodos son **encadenables** y el query no se ejecuta hasta que se usa `await`

---

### `findOne()` - Buscar un solo registro

```ts
this.pokemonModel.findOne({ no: +term })
this.pokemonModel.findOne({ name: term.toLowerCase().trim() })
```

* Retorna el **primer** documento que coincida con el filtro, o `null` si no encuentra nada
* Se usa en el proyecto combinado con `isValidObjectId()` y `findById()` para buscar por 3 criterios distintos en orden de prioridad: numero -> MongoID -> nombre
* El filtro es un objeto con los campos y valores a buscar

---

### `findById()` - Buscar por ObjectId

```ts
this.pokemonModel.findById(term)
```

* Es un atajo de `findOne({ _id: term })`. Es mas legible y ligeramente mas optimizado
* Espera recibir un string de 24 caracteres hexadecimales valido como MongoID

---

### `updateOne()` - Actualizar documento existente

```ts
await pokemon.updateOne(updatePokemonDto, { new: true })
```

* `updateOne()` se llama sobre la **instancia** del documento (despues de haberlo obtenido con `findOne()`)
* `{ new: true }` indica que se retorne el documento actualizado (aunque en el proyecto se combina manualmente usando spread operator)
* Tambien existe `findOneAndUpdate()` y `findByIdAndUpdate()` que hacen la busqueda y actualizacion en un solo paso

---

### `deleteOne()` - Eliminar un documento

```ts
const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id })
if (deletedCount === 0) throw new BadRequestException(...)
```

* Retorna un objeto con la propiedad `deletedCount` indicando cuantos documentos se eliminaron
* Si `deletedCount` es `0`, significa que el documento no existia y se lanza un error
* Es mas seguro que `findByIdAndDelete()` porque permite verificar si realmente se elimino algo

---

### `deleteMany()` - Eliminar todos los documentos

```ts
await this.pokemonModel.deleteMany()
```

* Sin filtro elimina **todos** los documentos de la coleccion
* Se usa en el `SeedService` para reiniciar la base de datos antes de insertar los nuevos datos
* Se puede pasar un filtro para eliminar solo documentos que cumplan una condicion: `deleteMany({ no: { $gt: 100 } })`

---

### `insertMany()` - Insercion masiva

```ts
await this.pokemonModel.insertMany(pokemonToInsert)
```

* Inserta un **arreglo** de documentos en una sola operacion hacia la base de datos
* Es **mucho mas rapido** que hacer `create()` en un bucle porque hace una sola llamada a la BD
* Si algun documento falla (por duplicado), mongoose puede configurarse para que falle toda la operacion o continue con los demas

---

### `isValidObjectId()` - Validar MongoID

```ts
import { isValidObjectId } from 'mongoose';
isValidObjectId(term) // true | false
```

* Funcion de mongoose que verifica si un string es un ObjectId valido de 24 caracteres hexadecimales
* Se usa tanto en el `ParseMongoIdPipe` como en el `findOne()` del service antes de llamar a `findById()`
* No lanza error, solo retorna `true` o `false`

---

### Error `code: 11000` - Duplicados

```ts
handleDBExceptions(error) {
  switch (true) {
    case error.code === 11000:
      throw new BadRequestException(`Pokemon already exist ${JSON.stringify(error.keyValue)}`)
    default:
      console.log(error)
      throw new InternalServerErrorException(`Error not handle`)
  }
}
```

* El error `11000` es el codigo de MongoDB para violacion de indices unicos
* `error.keyValue` contiene el campo y valor exacto que causo el duplicado (ej: `{ name: "pikachu" }`)
* Se centraliza el manejo en `handleDBExceptions()` para no repetir la logica en cada metodo del servicio

---

### Campos automaticos de mongoose: `_id` y `__v`

```ts
.select(['-__v'])
// resultado sin __v:
// { _id: "...", name: "pikachu", no: 25 }

// resultado completo:
// { _id: "...", __v: 0, name: "pikachu", no: 25 }
```

* `_id`: Mongo genera automaticamente un ObjectId unico para cada documento. Es el identificador principal
* `__v`: Campo interno de mongoose que lleva la cuenta de la version del documento (se incrementa en cada actualizacion)
* Se suele excluir `__v` del response porque no aporta informacion al cliente

---

### Metodos de instancia vs estaticos

```ts
// Metodo ESTATICO - se llama sobre el modelo
await this.pokemonModel.create(data)
await this.pokemonModel.find()
await this.pokemonModel.findById(id)
await this.pokemonModel.deleteOne({ _id: id })
await this.pokemonModel.insertMany([...])
await this.pokemonModel.deleteMany()

// Metodo de INSTANCIA - se llama sobre un documento obtenido
const pokemon = await this.pokemonModel.findById(id)
await pokemon.updateOne(data)
await pokemon.save()
pokemon.toJSON()
```

* **Metodos estaticos**: Se llaman directamente sobre `this.pokemonModel`. Crean, buscan, actualizan o eliminan documentos
* **Metodos de instancia**: Se llaman sobre un documento ya obtenido. Como `updateOne()`, `save()`, `toJSON()`
* `toJSON()`: Convierte el documento mongoose a un objeto JavaScript plano, eliminando metodos y datos internos

---

## Metodos alternativos y patrones comunes

### `findOneAndUpdate()` vs `findByIdAndUpdate()` vs `updateOne()`

```ts
// Opcion 1 - Dos pasos (usado en el proyecto)
const pokemon = await this.findOne(term)
await pokemon.updateOne(updatePokemonDto, { new: true })
return { ...pokemon.toJSON(), ...updatePokemonDto }

// Opcion 2 - Un solo paso (equivalente)
const pokemon = await this.pokemonModel.findOneAndUpdate(
  { no: +term },
  updatePokemonDto,
  { new: true }
)

// Opcion 3 - Por ID (atajo)
const pokemon = await this.pokemonModel.findByIdAndUpdate(id, updatePokemonDto, { new: true })
```

* `findOneAndUpdate()`: Busca por un filtro personalizado y actualiza en una sola operacion atomica
* `findByIdAndUpdate()`: Igual pero optimizado para busqueda por `_id`
* `{ new: true }`: Hace que retorne el documento **despues** de la actualizacion (por defecto retorna el original)
* En el proyecto se usa el metodo de dos pasos para reutilizar la logica de `findOne()` con los 3 criterios de busqueda

### `$regex` - Busquedas flexibles

```ts
// Busqueda exacta (usada en el proyecto)
this.pokemonModel.findOne({ name: term.toLowerCase().trim() })

// Busqueda flexible con regex (alternativa)
this.pokemonModel.findOne({ name: { $regex: term, $options: 'i' } })
```

* `$regex`: Permite busquedas parciales sin necesidad de que el string coincida exactamente
* `$options: 'i'`: Hace la busqueda case-insensitive (ignora mayusculas/minusculas)
* En el proyecto se usa busqueda exacta porque el nombre se guarda en minusculas

### `$gt`, `$lt`, `$in` - Operadores de comparacion

```ts
// Ejemplos de operadores de mongo utiles
this.pokemonModel.find({ no: { $gt: 100 } })           // mayor que
this.pokemonModel.find({ no: { $gte: 100 } })          // mayor o igual
this.pokemonModel.find({ no: { $lt: 100 } })           // menor que
this.pokemonModel.find({ no: { $in: [25, 6, 150] } })  // dentro de un arreglo
this.pokemonModel.find({ name: { $ne: 'pikachu' } })   // diferente de
```

* Operadores de MongoDB que se usan dentro del objeto de filtro
* Permiten hacer consultas avanzadas sin escribir codigo adicional

# Entidad / Schema

Se define la entidad de pokemon usando los decoradores de `@nestjs/mongoose`

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class Pokemon extends Document {

    @Prop({
        unique: true,
        index: true,
    })
    name!: string;

    @Prop({
        unique: true,
        index: true,
    })
    no!: number;
}

export const PokemonSchema = SchemaFactory.createForClass(Pokemon)
```

* `@Schema()`: Decorador que marca la clase como un schema de mongoose
* `extends Document`: Hace que la entidad tenga metodos de mongoose como `.save()`, `.toJSON()`, etc.
* `@Prop()`: Define cada propiedad del schema. Opciones como `unique` e `index` son de mongo
* `SchemaFactory.createForClass(Pokemon)`: Genera el schema de mongoose a partir de la clase decorada

## Opciones de `@Prop()`

```ts
@Prop({
  type: String,        // Tipo explicito (opcional, mongoose lo infiere)
  required: true,      // Campo obligatorio
  unique: true,        // Indice unico (no permite duplicados)
  index: true,         // Crea un indice para mejorar busquedas
  default: 'valor',    // Valor por defecto si no se envia
  trim: true,          // Elimina espacios al inicio y final
  lowercase: true,     // Convierte a minusculas automaticamente
})
```

* `unique`: Crea un indice unico en MongoDB. Si se intenta insertar un valor duplicado, mongo lanza error `11000`
* `index`: Crea un indice normal que acelera las busquedas por ese campo
* `default`: Si no se proporciona el campo, se usa este valor
* Estas opciones se definen a nivel de schema, no en el DTO. El DTO valida los datos de entrada, el schema define la estructura en BD

# PokemonModule - forFeature

Se registra el schema localmente en el modulo usando `MongooseModule.forFeature()`

```ts
@Module({
  controllers: [PokemonController],
  providers: [PokemonService],
  imports: [
    MongooseModule.forFeature([
      {
        name: Pokemon.name,
        schema: PokemonSchema
      }
    ])
  ],
  exports: [MongooseModule]
})
export class PokemonModule {}
```

* `MongooseModule.forFeature()`: Registra un schema en el contexto del modulo actual para que pueda ser inyectado con `@InjectModel()`
* `name: Pokemon.name`: El nombre del modelo (debe coincidir con el usado en `@InjectModel()`)
* `exports: [MongooseModule]`: Se exporta el modulo para que otros modulos (como SeedModule) puedan inyectar el modelo Pokemon

# DTOs - Data Transfer Objects

## CreatePokemonDto

Define la estructura y validaciones para crear un pokemon usando `class-validator`

```ts
import { IsInt, IsPositive, IsString, Min, MinLength } from "class-validator";

export class CreatePokemonDto {
    @IsInt()
    @IsPositive()
    @Min(1)
    no!: number;

    @IsString()
    @MinLength(1)
    name!: string;
}
```

* `@IsInt()`: Valida que sea un numero entero
* `@IsPositive()`: Valida que sea un numero positivo
* `@Min(1)`: Valor minimo permitido
* `@IsString()`: Valida que sea un string
* `@MinLength(1)`: Longitud minima del string

## UpdatePokemonDto - PartialType

Hereda todas las validaciones de CreatePokemonDto pero las vuelve opcionales

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePokemonDto } from './create-pokemon.dto';

export class UpdatePokemonDto extends PartialType(CreatePokemonDto) {}
```

* `PartialType()`: Viene de `@nestjs/mapped-types` y convierte todas las propiedades del DTO original en opcionales
* Esto permite enviar solo los campos que se quieren actualizar sin necesidad de enviar todo el objeto

## PaginationDto

DTO para los query params de paginacion

```ts
import { IsNumber, IsOptional, IsPositive, Min } from "class-validator";

export class PaginationDto {
    @IsOptional()
    @IsPositive()
    @IsNumber()
    limit?: number;

    @IsOptional()
    @Min(0)
    @IsNumber()
    offset?: number;
}
```

* `@IsOptional()`: Permite que el campo sea undefined, si no se envia no se valida
* `limit`: Cantidad de registros por pagina
* `offset`: Desde que registro empezar a contar

# Pokemon Service - CRUD

Servicio con las operaciones basicas de base de datos usando el modelo de mongoose

```ts
@Injectable()
export class PokemonService {

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>
  ) {}

  handleDBExceptions(error) {
    switch (true) {
      case error.code === 11000:
        throw new BadRequestException(`Pokemon already exist ${JSON.stringify(error.keyValue)}`)
      default:
        console.log(error)
        throw new InternalServerErrorException(`Error not handle`)
    }
  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase()
    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto)
      return pokemon;
    } catch (error: any) {
      this.handleDBExceptions(error)
    }
  }

  findAll({limit = 10, offset = 0}: PaginationDto) {
    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({ no: 1 })
      .select(['-__v'])
  }

  async findOne(term: string) {
    let pokemon: Pokemon | null = null
    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: +term })
    }
    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term)
    }
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.toLowerCase().trim() })
    }
    if (!pokemon) {
      throw new NotFoundException(`Pokemon with term: ${term} not found`)
    }
    return pokemon
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {
    try {
      const pokemon = await this.findOne(term)
      if (updatePokemonDto?.name) updatePokemonDto.name = updatePokemonDto.name.toLowerCase()
      await pokemon.updateOne(updatePokemonDto, { new: true });
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const {deletedCount} = await this.pokemonModel.deleteOne({ _id: id });
    if (deletedCount === 0) throw new BadRequestException(`Pokemon with id ${ id } not found`)
    return `Deleted`;
  }
}
```

* `handleDBExceptions`: Centraliza el manejo de errores de mongo, en particular el error `11000` por duplicados
* `create()`: Crea un pokemon en BD. Convierte el nombre a minusculas y captura errores de duplicados
* `findAll()`: Retorna todos los pokemon con paginacion (`limit`, `skip`), ordenados por `no` ascendente y excluyendo `__v`
* `findOne()`: Busca por 3 criterios en orden: numero de pokemon, MongoID, nombre. Si no encuentra lanza `NotFoundException`
* `update()`: Busca el pokemon por term, actualiza sus campos y retorna el objeto actualizado
* `remove()`: Elimina por id usando `deleteOne()`. Si `deletedCount` es 0 significa que no existia

# Pokemon Controller - Rutas

Controlador que expone los endpoints del CRUD

```ts
@UsePipes(ValidationPipe)
@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPokemonDto: CreatePokemonDto) {
    return this.pokemonService.create(createPokemonDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.pokemonService.findAll(paginationDto);
  }

  @Get(':term')
  findOne(@Param('term') id: string) {
    return this.pokemonService.findOne(id);
  }

  @Patch(':term')
  update(@Param('term') term: string, @Body() updatePokemonDto: UpdatePokemonDto) {
    return this.pokemonService.update(term, updatePokemonDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.pokemonService.remove(id);
  }
}
```

* `@UsePipes(ValidationPipe)`: Aplica el ValidationPipe a todas las rutas del controlador
* `@HttpCode(HttpStatus.CREATED)`: Cambia el codigo HTTP por defecto (201 en vez de 200)
* `@Query()`: Extrae los query params y los transforma al DTO gracias a `enableImplicitConversion`
* `@Param('id', ParseMongoIdPipe)`: Aplica el pipe personalizado solo a ese parametro

# ParseMongoIdPipe - Pipe personalizado

Pipe que valida si un string es un MongoID valido antes de procesarlo

```ts
@Injectable()
export class ParseMongoIdPipe implements PipeTransform {

  transform(value: string, metadata: ArgumentMetadata) {
    if (!isValidObjectId(value))
      throw new BadRequestException(`${value} is not a valid MongoID`)
    return value;
  }
}
```

* `PipeTransform`: Interface que deben implementar los pipes de Nest. Tiene el metodo `transform(value, metadata)`
* `isValidObjectId()`: Funcion de mongoose que verifica si un string es un ObjectId valido de mongo
* Si no es valido, lanza un `BadRequestException` con el mensaje personalizado

# CommonModule - Modulo Compartido

Modulo que agrupa componentes reutilizables (adapters, pipes, dtos)

```ts
@Module({
    providers: [AxiosAdapter],
    exports: [AxiosAdapter]
})
export class CommonModule {}
```

* `providers`: Registra el `AxiosAdapter` como provider para que pueda ser inyectado
* `exports`: Exporta el `AxiosAdapter` para que otros modulos puedan usarlo

# HttpAdapter Interface

Define el contrato que debe seguir cualquier adaptador HTTP

```ts
export interface HttpAdapter {
    get<T>(url: string): Promise<T>;
}
```

* Interface generica con un metodo `get<T>` que recibe una URL y retorna una promesa del tipo especificado
* Esto permite desacoplar la implementacion (axios, fetch, etc.) del negocio

# AxiosAdapter - Implementacion del Adaptador

Implementa la interfaz `HttpAdapter` usando axios internamente

```ts
@Injectable()
export class AxiosAdapter implements HttpAdapter {

    private readonly axios: AxiosInstance = axios

    async get<T>(url: string): Promise<T> {
        try {
            const { data } = await this.axios.get<T>(url)
            return data
        } catch (error) {
            throw new Error('Axios get adapter error')
        }
    }
}
```

* `@Injectable()`: Decorador que permite inyectar esta clase en otros servicios
* `implements HttpAdapter`: Implementa la interfaz definida anteriormente
* Gracias a esta abstraccion, si en el futuro se quiere cambiar axios por fetch, solo se crea un nuevo adapter

# Seed - Poblacion de Datos

## SeedModule

Modulo que importa `PokemonModule` y `CommonModule` para poder usar el modelo Pokemon y el AxiosAdapter

```ts
@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [PokemonModule, CommonModule]
})
export class SeedModule {}
```

* Importa `PokemonModule` para acceder al modelo Pokemon (gracias al `exports: [MongooseModule]`)
* Importa `CommonModule` para inyectar el `AxiosAdapter`

## SeedService

Servicio que obtiene 300 pokemon de la PokeAPI y los inserta en la base de datos

```ts
@Injectable()
export class SeedService {

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly http: AxiosAdapter
  ) {}

  async executeSeed() {
    try {
      const data = await this.http.get<PokeResponse>('https://pokeapi.co/api/v2/pokemon?limit=300')
      await this.pokemonModel.deleteMany()

      const pokemonToInsert: {name: string, no: number}[] = []

      data.results.forEach(({ name, url }) => {
        const segments = url.split('/')
        const no: number = +segments[segments.length - 2]
        pokemonToInsert.push({name, no})
      })

      await this.pokemonModel.insertMany(pokemonToInsert)
      console.log(`Seed executed`)
    } catch (error) {
      console.warn(error)
    }
    return `Seed executed`;
  }
}
```

* `deleteMany()`: Elimina todos los registros existentes antes de insertar los nuevos (reinicia la coleccion)
* `insertMany()`: Inserta multiples registros en una sola operacion, mucho mas eficiente que hacer `create()` uno por uno
* La URL de la PokeAPI tiene el formato `https://pokeapi.co/api/v2/pokemon/25/`, se extrae el numero del pokemon del ultimo segmento

## SeedController

Controlador con un unico endpoint GET para ejecutar el seed

```ts
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  executeSeed() {
    return this.seedService.executeSeed();
  }
}
```

* Endpoint `GET /api/v2/seed` que dispara la carga masiva de datos

## PokeResponse Interface

Tipado de la respuesta que devuelve la PokeAPI

```ts
export interface PokeResponse {
    count:    number;
    next:     string;
    previous: null;
    results:  Result[];
}

export interface Result {
    name: string;
    url:  string;
}
```

* `results`: Arreglo de objetos con `name` y `url` de cada pokemon
* Se usa el generic `<PokeResponse>` en el `http.get<PokeResponse>()` para tener tipado fuerte
