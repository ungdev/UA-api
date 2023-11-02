import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as tournamentOperations from '../../src/operations/tournament';
import database from '../../src/services/database';
import { Error } from '../../src/types';
import {createFakeTeam, createFakeTournament} from '../utils';
import {lockTeam} from "../../src/operations/team";

describe('GET /tournaments', () => {
  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
    await database.tournament.delete({where: {id: "1p"}});
    await database.caster.deleteMany();
  });

  before(async () => {
    await database.tournament.updateMany({
      data: {
        display: true,
        displayCashprize: true,
        displayCasters: true,
      },
    });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'fetchTournaments').throws('Unexpected error');

    await request(app).get('/tournaments').expect(500, { error: Error.InternalServerError });
  });

  it('should return 200 with an array of tournaments', async () => {
    const tournaments = await tournamentOperations.fetchTournaments();

    await Promise.all(
      tournaments.map(({ id }) =>
        database.tournament.update({
          data: {
            casters: { create: { id: `caster-${id}`, name: `un caster pour ${id}` } },
            cashprize: 42,
          },
          where: { id },
        }),
      ),
    );

    // add display false to a random tournament
    await database.tournament.update({
      where: {
        id: tournaments[0].id,
      },
      data: {
        display: false,
      },
    });

    await createFakeTeam({ members: tournaments[1].playersPerTeam, tournament: tournaments[1].id });

    const response = await request(app).get('/tournaments').expect(200);

    expect(response.body).to.have.lengthOf(tournaments.length - 1);
    // Not to have tournaments[0] because it has display false
    expect(response.body).not.to.have.deep.members([tournaments[0]]);
    expect(response.body[0]).to.have.all.keys([
      'id',
      'name',
      'maxPlayers',
      'lockedTeamsCount',
      'teams',
      'placesLeft',
      'playersPerTeam',
      'cashprize',
      'casters',
      'infos',
      'format',
      'cashprizeDetails',
      'position',
    ]);
    expect(response.body[0].lockedTeamsCount).to.be.a('number');
    expect(response.body[0].cashprize).to.be.a('number');
    expect(response.body[0].casters).to.be.a('array');
    expect(response.body[0].teams[0].players[0].id).to.be.a('string');
    expect(response.body[0].teams[0].players[0].firstname).to.be.undefined;
  });

  it('should return 200 with an array of tournaments with the right fields', async () => {
    const tournaments = await tournamentOperations.fetchTournaments();

    await database.tournament.update({
      where: {
        id: tournaments[0].id,
      },
      data: {
        display: true,
        displayCashprize: false,
        displayCasters: false,
      },
    });

    const response = await request(app).get('/tournaments').expect(200);

    expect(response.body).to.have.lengthOf(tournaments.length);
    expect(response.body[0]).to.have.all.keys([
      'id',
      'name',
      'maxPlayers',
      'lockedTeamsCount',
      'teams',
      'placesLeft',
      'playersPerTeam',
      'cashprize',
      'casters',
      'infos',
      'format',
      'cashprizeDetails',
      'position',
    ]);
    expect(response.body[1].lockedTeamsCount).to.be.a('number');
    expect(response.body[0].cashprize).to.be.null;
    expect(response.body[0].casters).to.be.null;
    expect(response.body[1].teams[0].players[0].id).to.be.a('string');
    expect(response.body[1].teams[0].players[0].firstname).to.be.undefined;
  });

  it('should return positionInQueue in the endpoint response', async () => {
    const tournament = await createFakeTournament({id: "1p", name: "To1Player", playersPerTeam: 1, maxTeams: 1});
    await database.tournament.update({
      where: {
        id: tournament.id,
      },
      data: {
        display: true,
        displayCashprize: false,
        displayCasters: false,
      },
    });
    const team1 = await createFakeTeam({ members: tournament.playersPerTeam, tournament: tournament.id, paid: true });
    await lockTeam(team1.id);
    const team2 = await createFakeTeam({ members: tournament.playersPerTeam, tournament: tournament.id, paid: true });
    await lockTeam(team2.id);
    const team3 = await createFakeTeam({ members: tournament.playersPerTeam, tournament: tournament.id, paid: true });
    await lockTeam(team3.id);

    const response = await request(app).get('/tournaments').expect(200);
    const teamList = response.body[0].teams;
    expect(teamList.length).to.be.equal(3);
    for(let i=0; i < teamList.length; i++) {
      if (teamList[i].id == team1.id) {
        expect(teamList[i].lockedAt).to.be.not.null;
        expect(teamList[i].positionInQueue).to.be.null;
      } else if(teamList[i].id == team2.id) {
        expect(teamList[i].lockedAt).to.be.null;
        expect(teamList[i].positionInQueue).to.be.equal(1);
      } else if(teamList[i].id == team3.id) {
        expect(teamList[i].lockedAt).to.be.null;
        expect(teamList[i].positionInQueue).to.be.equal(2);
      }
    }
  });
});
